import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        inventory_item_id: z.string().describe('The ID of the inventory item to adjust. Example: "7684452058850661608"'),
        location_id: z.string().describe('The ID of the location where the inventory is stored. Example: "7683107397838218873"'),
        available_adjustment: z
            .number()
            .describe('The signed integer delta to apply to the available quantity. Positive to increase, negative to decrease. Example: 5')
    })
    .describe('Input for adjusting an inventory level by a relative delta.');

const InventoryLevelSchema = z.object({
    inventory_item_id: z.string().describe('The ID of the inventory item.'),
    location_id: z.string().describe('The ID of the location.'),
    available: z.number().describe('The available quantity after the adjustment.'),
    update_at: z.string().optional().describe('The timestamp when the inventory level was last updated.'),
    variant_id: z.string().optional().describe('The ID of the product variant associated with this inventory level.')
});

const OutputSchema = z
    .object({
        inventory_level: InventoryLevelSchema.describe('The updated inventory level after the adjustment.')
    })
    .describe('Result of adjusting an inventory level by a relative delta.');

/**
 * @tags: [write]
 * @tagReason: Adjusts inventory quantity by a relative delta via POST to the inventory_levels/adjust endpoint.
 * @pitfalls: The inventory item must have tracked:true before calling this endpoint; otherwise the API returns a 400 error.
 */
const action = createAction({
    description: "Adjust an inventory item's available quantity at a location by a relative delta.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/inventory-level-adjust
            endpoint: '/admin/openapi/v20260601/inventory_levels/adjust.json',
            data: {
                inventory_item_id: input.inventory_item_id,
                location_id: input.location_id,
                available_adjustment: input.available_adjustment
            },
            retries: 3
        });

        const parsed = z
            .object({
                inventory_level: InventoryLevelSchema
            })
            .parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
