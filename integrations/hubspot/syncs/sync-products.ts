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

const CheckpointSchema = z.object({
    updatedAfter: z.string()
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

const ProductSearchResponseSchema = z.object({
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

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync product records with pricing, SKU, quantity, and billing details',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-products', group: 'Products' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

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
            ]
        };

        if (checkpoint?.updatedAfter) {
            searchBody['filterGroups'] = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint.updatedAfter
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;

        do {
            if (after) {
                searchBody['after'] = after;
            } else {
                delete searchBody['after'];
            }

            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/products/search',
                data: searchBody,
                retries: 3
            });

            const data = ProductSearchResponseSchema.parse(response.data);
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

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Product');

            const lastRecord = records[records.length - 1]!;
            const lastUpdated = lastRecord.updatedAt;
            if (lastUpdated) {
                await nango.saveCheckpoint({
                    updatedAfter: lastUpdated
                });
            }

            after = data.paging?.next?.after;
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
