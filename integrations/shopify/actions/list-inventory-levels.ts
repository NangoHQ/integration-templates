import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().optional().describe('Shopify location GID to filter inventory levels by. Example: "gid://shopify/Location/346779380"'),
    inventoryItemId: z
        .string()
        .optional()
        .describe('Shopify inventory item GID to filter inventory levels by. Example: "gid://shopify/InventoryItem/30322695"'),
    first: z.number().int().min(1).max(250).optional().describe('Number of inventory levels to return per page. Max 250. Defaults to 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Optional query filter for inventory levels. Example: "id:>=1234"')
});

const QuantitySchema = z.object({
    name: z.string(),
    quantity: z.number().int()
});

const InventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().optional()
});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const InventoryLevelSchema = z.object({
    id: z.string(),
    quantities: z.array(QuantitySchema),
    inventoryItem: InventoryItemSchema,
    location: LocationSchema
});

const OutputSchema = z.object({
    inventoryLevels: z.array(InventoryLevelSchema),
    nextCursor: z.string().optional()
});

const ProviderQuantitySchema = z.object({
    name: z.string(),
    quantity: z.number().int()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    sku: z.string().nullable().optional()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderInventoryLevelSchema = z.object({
    id: z.string(),
    quantities: z.array(ProviderQuantitySchema),
    item: ProviderItemSchema,
    location: ProviderLocationSchema
});

const ProviderPageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean().optional()
});

const ProviderInventoryLevelsConnectionSchema = z.object({
    edges: z.array(
        z.object({
            node: ProviderInventoryLevelSchema
        })
    ),
    pageInfo: ProviderPageInfoSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            location: z
                .object({
                    inventoryLevels: ProviderInventoryLevelsConnectionSchema
                })
                .optional(),
            inventoryItem: z
                .object({
                    inventoryLevels: ProviderInventoryLevelsConnectionSchema
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'List inventory levels for a location or inventory item.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-inventory-levels',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.locationId && !input.inventoryItemId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either locationId or inventoryItemId is required.'
            });
        }

        const first = input.first ?? 50;
        let graphQLQuery: string;
        let variables: { id: string; first: number; after: string | null; query: string | null };

        if (input.locationId) {
            graphQLQuery = `
                query ListInventoryLevels($id: ID!, $first: Int!, $after: String, $query: String) {
                    location(id: $id) {
                        inventoryLevels(first: $first, after: $after, query: $query) {
                            edges {
                                node {
                                    id
                                    quantities(names: ["available", "incoming", "committed", "damaged", "on_hand", "quality_control", "reserved", "safety_stock"]) {
                                        name
                                        quantity
                                    }
                                    item {
                                        id
                                        sku
                                    }
                                    location {
                                        id
                                        name
                                    }
                                }
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                    }
                }
            `;
            variables = {
                id: input.locationId,
                first,
                after: input.after ?? null,
                query: input.query ?? null
            };
        } else {
            const inventoryItemId = input.inventoryItemId;
            if (!inventoryItemId) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'inventoryItemId is required when locationId is not provided.'
                });
            }
            graphQLQuery = `
                query ListInventoryLevels($id: ID!, $first: Int!, $after: String, $query: String) {
                    inventoryItem(id: $id) {
                        inventoryLevels(first: $first, after: $after, query: $query) {
                            edges {
                                node {
                                    id
                                    quantities(names: ["available", "incoming", "committed", "damaged", "on_hand", "quality_control", "reserved", "safety_stock"]) {
                                        name
                                        quantity
                                    }
                                    item {
                                        id
                                        sku
                                    }
                                    location {
                                        id
                                        name
                                    }
                                }
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                    }
                }
            `;
            variables = {
                id: inventoryItemId,
                first,
                after: input.after ?? null,
                query: input.query ?? null
            };
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: graphQLQuery,
                variables
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from Shopify.'
            });
        }

        const rawData = ProviderResponseSchema.parse(response.data);

        if (rawData.errors && rawData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: rawData.errors.map((e) => e.message).join('; ')
            });
        }

        const connection = input.locationId ? rawData.data?.location?.inventoryLevels : rawData.data?.inventoryItem?.inventoryLevels;

        if (!connection) {
            throw new nango.ActionError({
                type: 'not_found',
                message: input.locationId ? 'Location not found.' : 'Inventory item not found.'
            });
        }

        const inventoryLevels = connection.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                quantities: node.quantities.map((q) => ({
                    name: q.name,
                    quantity: q.quantity
                })),
                inventoryItem: {
                    id: node.item.id,
                    ...(node.item.sku != null && { sku: node.item.sku })
                },
                location: {
                    id: node.location.id,
                    ...(node.location.name != null && { name: node.location.name })
                }
            };
        });

        return {
            inventoryLevels,
            ...(connection.pageInfo?.endCursor != null && connection.pageInfo?.hasNextPage ? { nextCursor: connection.pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
