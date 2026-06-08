import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderVariantSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    product: z
        .object({
            id: z.string(),
            title: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const ProviderInventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().nullable().optional(),
    tracked: z.boolean(),
    unitCost: z
        .object({
            amount: z.string().nullable().optional(),
            currencyCode: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    countryCodeOfOrigin: z.string().nullable().optional(),
    harmonizedSystemCode: z.string().nullable().optional(),
    updatedAt: z.string(),
    variant: ProviderVariantSchema.nullable().optional()
});

const VariantSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    displayName: z.string().optional(),
    productId: z.string().optional(),
    productTitle: z.string().optional()
});

const InventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().optional(),
    tracked: z.boolean(),
    unitCost: z
        .object({
            amount: z.string().optional(),
            currencyCode: z.string().optional()
        })
        .optional(),
    countryCodeOfOrigin: z.string().optional(),
    harmonizedSystemCode: z.string().optional(),
    updatedAt: z.string().optional(),
    variant: VariantSchema.optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify inventory items with SKU, tracking, and cost data.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/inventory-items'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        InventoryItem: InventoryItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'] ? checkpoint['updated_after'] : undefined;
        let cursor = checkpoint?.['cursor'] ? checkpoint['cursor'] : undefined;

        let maxUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/inventoryItems
            endpoint: '/admin/api/2025-01/graphql.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                query: `
                    query inventoryItems($first: Int!, $after: String, $query: String) {
                        inventoryItems(first: $first, after: $after, query: $query) {
                            nodes {
                                id
                                sku
                                tracked
                                unitCost {
                                    amount
                                    currencyCode
                                }
                                countryCodeOfOrigin
                                harmonizedSystemCode
                                updatedAt
                                variant {
                                    id
                                    title
                                    displayName
                                    product {
                                        id
                                        title
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 100,
                    ...(updatedAfter && { query: `updated_at:>${updatedAfter}` }),
                    ...(cursor && { after: cursor })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.inventoryItems.pageInfo.endCursor',
                response_path: 'data.inventoryItems.nodes',
                limit_name_in_request: 'variables.first',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderInventoryItemSchema).safeParse(rawPage);
            if (!parsed.success) {
                throw new Error(`Failed to parse inventory items: ${parsed.error.message}`);
            }

            const items = parsed.data;

            if (items.length === 0) {
                continue;
            }

            const mapped = items.map((item) => {
                const record = {
                    id: item.id,
                    ...(item.sku != null && { sku: item.sku }),
                    tracked: item.tracked,
                    ...(item.unitCost != null && {
                        unitCost: {
                            ...(item.unitCost.amount != null && { amount: item.unitCost.amount }),
                            ...(item.unitCost.currencyCode != null && { currencyCode: item.unitCost.currencyCode })
                        }
                    }),
                    ...(item.countryCodeOfOrigin != null && { countryCodeOfOrigin: item.countryCodeOfOrigin }),
                    ...(item.harmonizedSystemCode != null && { harmonizedSystemCode: item.harmonizedSystemCode }),
                    updatedAt: item.updatedAt,
                    ...(item.variant != null && {
                        variant: {
                            id: item.variant.id,
                            ...(item.variant.title != null && { title: item.variant.title }),
                            ...(item.variant.displayName != null && { displayName: item.variant.displayName }),
                            ...(item.variant.product?.id != null && { productId: item.variant.product.id }),
                            ...(item.variant.product?.title != null && { productTitle: item.variant.product.title })
                        }
                    })
                };
                return record;
            });

            await nango.batchSave(mapped, 'InventoryItem');

            for (const item of items) {
                if (maxUpdatedAt === undefined || item.updatedAt > maxUpdatedAt) {
                    maxUpdatedAt = item.updatedAt;
                }
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
