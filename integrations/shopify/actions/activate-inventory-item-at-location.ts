import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    inventoryItemId: z.string().describe('The ID of the inventory item to activate. Example: "gid://shopify/InventoryItem/43729076"'),
    locationId: z.string().describe('The ID of the location where the inventory item should be activated. Example: "gid://shopify/Location/346779380"'),
    onHand: z.number().int().optional().describe('The initial on_hand quantity of the inventory item being activated at the location.'),
    available: z.number().int().optional().describe('The initial available quantity of the inventory item being activated at the location.')
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional().nullable(),
    message: z.string()
});

const ProviderQuantitySchema = z.object({
    name: z.string(),
    quantity: z.number().int()
});

const ProviderInventoryLevelSchema = z.object({
    id: z.string(),
    canDeactivate: z.boolean().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    item: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    location: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    quantities: z.array(ProviderQuantitySchema).optional().nullable()
});

const OutputSchema = z.object({
    inventoryLevel: z
        .object({
            id: z.string(),
            canDeactivate: z.boolean().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            item: z
                .object({
                    id: z.string()
                })
                .optional(),
            location: z
                .object({
                    id: z.string()
                })
                .optional(),
            quantities: z
                .array(
                    z.object({
                        name: z.string(),
                        quantity: z.number().int()
                    })
                )
                .optional()
        })
        .optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Activate tracking for a Shopify inventory item at a location.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/activate-inventory-item-at-location',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            inventoryItemId: input.inventoryItemId,
            locationId: input.locationId
        };

        if (input.onHand !== undefined) {
            variables['onHand'] = input.onHand;
        }

        if (input.available !== undefined) {
            variables['available'] = input.available;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/inventoryActivate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation ActivateInventoryItem($inventoryItemId: ID!, $locationId: ID!, $onHand: Int, $available: Int) {
                        inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, onHand: $onHand, available: $available) {
                            inventoryLevel {
                                id
                                canDeactivate
                                createdAt
                                updatedAt
                                item {
                                    id
                                }
                                location {
                                    id
                                }
                                quantities(names: ["available", "on_hand"]) {
                                    name
                                    quantity
                                }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const payload = z
            .object({
                data: z.object({
                    inventoryActivate: z.object({
                        inventoryLevel: ProviderInventoryLevelSchema.nullable().optional(),
                        userErrors: z.array(ProviderUserErrorSchema)
                    })
                })
            })
            .parse(response.data);

        const level = payload.data.inventoryActivate.inventoryLevel;
        const errors = payload.data.inventoryActivate.userErrors;

        return {
            ...(level != null && {
                inventoryLevel: {
                    id: level.id,
                    ...(level.canDeactivate != null && { canDeactivate: level.canDeactivate }),
                    ...(level.createdAt != null && { createdAt: level.createdAt }),
                    ...(level.updatedAt != null && { updatedAt: level.updatedAt }),
                    ...(level.item != null && { item: { id: level.item.id } }),
                    ...(level.location != null && { location: { id: level.location.id } }),
                    ...(level.quantities != null && {
                        quantities: level.quantities.map((q) => ({
                            name: q.name,
                            quantity: q.quantity
                        }))
                    })
                }
            }),
            userErrors: errors.map((err) => ({
                ...(err.field != null && { field: err.field }),
                message: err.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
