import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    inventory_level_id: z
        .string()
        .describe('The GID of the inventory level to deactivate. Example: "gid://shopify/InventoryLevel/123456789?inventory_item_id=987654321"')
});

const UserErrorSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    deactivated: z.boolean(),
    user_errors: z.array(UserErrorSchema).optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inventoryDeactivate: z.object({
            userErrors: z.array(
                z.object({
                    message: z.string()
                })
            )
        })
    })
});

const action = createAction({
    description: 'Deactivate tracking for a Shopify inventory item at a location.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/deactivate-inventory-item-at-location',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/inventoryDeactivate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation inventoryDeactivate($inventoryLevelId: ID!) {
                        inventoryDeactivate(inventoryLevelId: $inventoryLevelId) {
                            userErrors {
                                message
                            }
                        }
                    }
                `,
                variables: {
                    inventoryLevelId: input.inventory_level_id
                }
            },
            retries: 1
        });

        const payload = ProviderResponseSchema.parse(response.data);
        const userErrors = payload.data.inventoryDeactivate.userErrors;

        return {
            deactivated: userErrors.length === 0,
            ...(userErrors.length > 0 && { user_errors: userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
