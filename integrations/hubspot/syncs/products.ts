import { createSync } from 'nango';
import { z } from 'zod';

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    price: z.number().optional(),
    costOfGoodsSold: z.number().optional(),
    billingFrequency: z.string().optional(),
    recurringBillingPeriod: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProductApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            name: z.string().nullish(),
            description: z.string().nullish(),
            hs_sku: z.string().nullish(),
            price: z.string().nullish(),
            hs_cost_of_goods_sold: z.string().nullish(),
            recurringbillingfrequency: z.string().nullish(),
            hs_recurring_billing_period: z.string().nullish(),
            createdate: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const ProductResponseSchema = z.object({
    results: z.array(ProductApiSchema).optional(),
    paging: z
        .object({
            next: z
                .object({
                    after: z.string()
                })
                .optional()
        })
        .optional()
});

const HubspotCrmCheckpointSchema = z.object({
    phase: z.string(),
    after: z.string(),
    updatedAfter: z.string(),
    windowCount: z.number()
});

type HubspotCrmCheckpoint = {
    phase: 'initial' | 'incremental';
    after?: string;
    updatedAfter?: string;
    windowCount: number;
};

function parseHubspotCrmCheckpoint(value: unknown): HubspotCrmCheckpoint | undefined {
    const result = HubspotCrmCheckpointSchema.safeParse(value);
    if (!result.success) {
        return undefined;
    }

    const { phase, after, updatedAfter, windowCount } = result.data;
    if (phase !== 'initial' && phase !== 'incremental') {
        return undefined;
    }

    const checkpoint: HubspotCrmCheckpoint = { phase, windowCount };

    if (after) {
        checkpoint.after = after;
    }

    if (updatedAfter) {
        checkpoint.updatedAfter = updatedAfter;
    }

    return checkpoint;
}

function updateLatestUpdatedAt(current: string | undefined, candidate: string | null | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    return !current || candidate > current ? candidate : current;
}

const sync = createSync({
    description: 'Sync product records with pricing, SKU, quantity, and billing details',
    version: '3.0.2',
    endpoints: [{ method: 'POST', path: '/syncs/products', group: 'Products' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-products-v3/basic/get-crm-v3-objects-products
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/products',
                    params: {
                        limit: '100',
                        properties:
                            'name,description,hs_sku,price,hs_cost_of_goods_sold,recurringbillingfrequency,hs_recurring_billing_period,createdate,hs_lastmodifieddate',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = ProductResponseSchema.parse(response.data);
                const products = data.results || [];

                if (products.length === 0) {
                    break;
                }

                const records = products.map((product) => ({
                    id: product.id,
                    name: product.properties?.['name'] ?? undefined,
                    description: product.properties?.['description'] ?? undefined,
                    sku: product.properties?.['hs_sku'] ?? undefined,
                    price: product.properties?.['price'] ? parseFloat(product.properties['price']) : undefined,
                    costOfGoodsSold: product.properties?.['hs_cost_of_goods_sold'] ? parseFloat(product.properties['hs_cost_of_goods_sold']) : undefined,
                    billingFrequency: product.properties?.['recurringbillingfrequency'] ?? undefined,
                    recurringBillingPeriod: product.properties?.['hs_recurring_billing_period'] ?? undefined,
                    createdAt: product.createdAt ?? product.properties?.['createdate'] ?? undefined,
                    updatedAt: product.updatedAt ?? product.properties?.['hs_lastmodifieddate'] ?? undefined
                }));

                await nango.batchSave(records, 'Product');

                latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

                const nextAfter = data.paging?.next?.after;

                if (nextAfter) {
                    await nango.saveCheckpoint({
                        phase: 'initial',
                        after: nextAfter,
                        updatedAfter: latestUpdatedAt || '',
                        windowCount: 0
                    });
                    after = nextAfter;
                    continue;
                }

                if (latestUpdatedAt) {
                    await nango.saveCheckpoint({
                        phase: 'incremental',
                        after: '',
                        updatedAfter: latestUpdatedAt,
                        windowCount: 0
                    });
                }

                hasMore = false;
            }

            return;
        }

        // HubSpot search queries can only page through 10,000 total results; paging past that
        // returns a 400. Once a search window approaches the cap, advance the window's lower
        // bound to the latest modification time seen so far and resume paging from there, which
        // partitions the incremental run into bounded sub-windows instead of ever hitting the cap.
        // The window count is persisted in the checkpoint since a run can be interrupted and
        // resumed mid-window, at which point the in-memory count alone would be lost.
        // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
        const SEARCH_WINDOW_RESULT_LIMIT = 9900;

        let windowFloor = checkpoint.updatedAfter;
        let after = checkpoint.after;
        let latestUpdatedAt = windowFloor;
        let resultsInWindow = checkpoint.windowCount;
        let hasMore = true;

        while (hasMore) {
            const searchBody: Record<string, unknown> = {
                limit: 100,
                properties: [
                    'name',
                    'description',
                    'hs_sku',
                    'price',
                    'hs_cost_of_goods_sold',
                    'recurringbillingfrequency',
                    'hs_recurring_billing_period',
                    'createdate',
                    'hs_lastmodifieddate'
                ],
                sorts: [
                    {
                        propertyName: 'hs_lastmodifieddate',
                        direction: 'ASCENDING'
                    }
                ],
                filterGroups: [
                    {
                        filters: [
                            {
                                // GTE (not GT): records sharing the exact boundary timestamp with the
                                // last-seen record may still be unfetched on a later page when a window
                                // advance truncates the search early. GT would permanently skip them;
                                // GTE re-fetches them and batchSave upserts them idempotently.
                                propertyName: 'hs_lastmodifieddate',
                                operator: 'GTE',
                                value: windowFloor
                            }
                        ]
                    }
                ],
                ...(after && { after })
            };

            // Incremental syncs use search so they can filter by last modified date.
            const response = await nango.post({
                endpoint: '/crm/v3/objects/products/search',
                data: searchBody,
                retries: 3
            });

            const data = ProductResponseSchema.parse(response.data);
            const products = data.results || [];

            if (products.length === 0) {
                break;
            }

            const records = products.map((product) => ({
                id: product.id,
                name: product.properties?.['name'] ?? undefined,
                description: product.properties?.['description'] ?? undefined,
                sku: product.properties?.['hs_sku'] ?? undefined,
                price: product.properties?.['price'] ? parseFloat(product.properties['price']) : undefined,
                costOfGoodsSold: product.properties?.['hs_cost_of_goods_sold'] ? parseFloat(product.properties['hs_cost_of_goods_sold']) : undefined,
                billingFrequency: product.properties?.['recurringbillingfrequency'] ?? undefined,
                recurringBillingPeriod: product.properties?.['hs_recurring_billing_period'] ?? undefined,
                createdAt: product.createdAt ?? product.properties?.['createdate'] ?? undefined,
                updatedAt: product.updatedAt ?? product.properties?.['hs_lastmodifieddate'] ?? undefined
            }));

            await nango.batchSave(records, 'Product');

            latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);
            resultsInWindow += products.length;

            const nextAfter = data.paging?.next?.after;

            if (nextAfter && resultsInWindow >= SEARCH_WINDOW_RESULT_LIMIT) {
                windowFloor = latestUpdatedAt || windowFloor;
                after = '';
                resultsInWindow = 0;
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: windowFloor || '',
                    windowCount: 0
                });
                continue;
            }

            if (nextAfter) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: nextAfter,
                    updatedAfter: windowFloor || '',
                    windowCount: resultsInWindow
                });
                after = nextAfter;
                continue;
            }

            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: latestUpdatedAt,
                    windowCount: 0
                });
            }

            hasMore = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
