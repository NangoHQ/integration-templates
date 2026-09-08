import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        inventory_item_id: z.string().describe('The ID of the inventory item to update. Example: "7683107486941858849"'),
        tracked: z
            .boolean()
            .optional()
            .describe(
                'Whether Nango should track inventory quantities for this item. Setting to true is required before inventory_levels adjust or set will succeed.'
            ),
        cost: z.string().optional().describe('The unit cost of the inventory item as a decimal string. Example: "10.00"'),
        required_shipping: z.boolean().optional().describe('Whether the item requires shipping.')
    })
    .describe('Input to update an inventory item');

const ProviderInventoryItemSchema = z
    .object({
        id: z.string(),
        tracked: z.boolean().optional(),
        cost: z.string().nullable().optional(),
        required_shipping: z.boolean().optional(),
        sku: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the updated inventory item.'),
        tracked: z.boolean().optional().describe('Whether inventory tracking is enabled.'),
        cost: z.string().optional().describe('The unit cost as a decimal string.'),
        required_shipping: z.boolean().optional().describe('Whether shipping is required.'),
        sku: z.string().optional().describe('The SKU of the inventory item.'),
        created_at: z.string().optional().describe('The creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('The last update timestamp in ISO 8601 format.')
    })
    .describe('The updated inventory item');

/**
 * @tags: [write]
 * @tagReason: Updates an inventory item by making a PUT request to the provider.
 * @pitfalls: Inventory level adjust and set operations return 400 until tracked is set to true on the item.
 */
const action = createAction({
    description: 'Update an inventory item (e.g. enable tracking, set cost).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/update-an-inventory-item
            endpoint: `/admin/openapi/v20260601/inventory_items/${encodeURIComponent(input.inventory_item_id)}.json`,
            data: {
                inventory_item: {
                    ...(input.tracked !== undefined && { tracked: input.tracked }),
                    ...(input.cost !== undefined && { cost: input.cost }),
                    ...(input.required_shipping !== undefined && { required_shipping: input.required_shipping })
                }
            },
            retries: 3
        });

        const inventoryItem = ProviderInventoryItemSchema.parse(response.data.inventory_item);

        return {
            id: inventoryItem.id,
            ...(inventoryItem.tracked !== undefined && { tracked: inventoryItem.tracked }),
            ...(inventoryItem.cost != null && { cost: inventoryItem.cost }),
            ...(inventoryItem.required_shipping !== undefined && { required_shipping: inventoryItem.required_shipping }),
            ...(inventoryItem.sku != null && { sku: inventoryItem.sku }),
            ...(inventoryItem.created_at !== undefined && { created_at: inventoryItem.created_at }),
            ...(inventoryItem.updated_at !== undefined && { updated_at: inventoryItem.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
