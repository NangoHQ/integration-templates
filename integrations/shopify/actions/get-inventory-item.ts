import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the inventory item. Example: "gid://shopify/InventoryItem/1234567890"')
});

const ProviderInventoryQuantitySchema = z.object({
    name: z.string(),
    quantity: z.number()
});

const ProviderInventoryLevelSchema = z.object({
    id: z.string(),
    location: z.object({
        id: z.string(),
        name: z.string()
    }),
    quantities: z.array(ProviderInventoryQuantitySchema)
});

const ProviderInventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().nullable().optional(),
    tracked: z.boolean(),
    inventoryLevels: z
        .object({
            edges: z.array(
                z.object({
                    node: ProviderInventoryLevelSchema
                })
            )
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    sku: z.string().optional(),
    tracked: z.boolean(),
    inventoryLevels: z
        .array(
            z.object({
                id: z.string(),
                location: z.object({
                    id: z.string(),
                    name: z.string()
                }),
                quantities: z.array(
                    z.object({
                        name: z.string(),
                        quantity: z.number()
                    })
                )
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Shopify inventory item by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-inventory-item',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/inventoryItem
        const response = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetInventoryItem($id: ID!) {
                        inventoryItem(id: $id) {
                            id
                            sku
                            tracked
                            inventoryLevels(first: 10) {
                                edges {
                                    node {
                                        id
                                        location {
                                            id
                                            name
                                        }
                                        quantities(names: ["available", "on_hand", "incoming", "committed"]) {
                                            name
                                            quantity
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const graphQLData = z
            .object({
                data: z.object({
                    inventoryItem: ProviderInventoryItemSchema.nullable()
                }),
                errors: z
                    .array(
                        z.object({
                            message: z.string()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        const firstError = graphQLData.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message
            });
        }

        const item = graphQLData.data.inventoryItem;

        if (!item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Inventory item not found',
                id: input.id
            });
        }

        return {
            id: item.id,
            ...(item.sku != null && { sku: item.sku }),
            tracked: item.tracked,
            ...(item.inventoryLevels != null && {
                inventoryLevels: item.inventoryLevels.edges.map((edge) => ({
                    id: edge.node.id,
                    location: {
                        id: edge.node.location.id,
                        name: edge.node.location.name
                    },
                    quantities: edge.node.quantities.map((q) => ({
                        name: q.name,
                        quantity: q.quantity
                    }))
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
