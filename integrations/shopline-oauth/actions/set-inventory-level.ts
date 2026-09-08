import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        inventory_item_id: z.string().describe('The ID of the inventory item to set availability for.'),
        location_id: z.string().describe('The ID of the location where the inventory level should be set.'),
        available: z.number().int().describe('The absolute available quantity to set.')
    })
    .describe('Input for setting an inventory level to an absolute value.');

const ProviderResponseSchema = z.object({
    inventory_level: z.object({
        inventory_item_id: z.string(),
        location_id: z.string(),
        available: z.number(),
        updated_at: z.string(),
        variant_id: z.string().optional()
    })
});

const OutputSchema = z
    .object({
        inventory_item_id: z.string().describe('The ID of the inventory item whose level was set.'),
        location_id: z.string().describe('The ID of the location where the level was set.'),
        available: z.number().describe('The new absolute available quantity.'),
        updated_at: z.string().describe('The timestamp when the inventory level was last updated.'),
        variant_id: z.string().optional().describe('The ID of the variant associated with the inventory item.')
    })
    .describe('The updated inventory level after setting the available quantity.');

/**
 * @tags: [write]
 * @tagReason: Sets an inventory item's available quantity at a location to an absolute value via a POST request.
 * @pitfalls: The inventory item must have tracked: true before this action can be called; otherwise the API returns a 400 error.
 */
const action = createAction({
    description: "Set an inventory item's available quantity at a location to an absolute value.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/set-item-inventory
            endpoint: '/admin/openapi/v20260601/inventory_levels/set.json',
            data: {
                inventory_item_id: input.inventory_item_id,
                location_id: input.location_id,
                available: input.available
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            inventory_item_id: providerResponse.inventory_level.inventory_item_id,
            location_id: providerResponse.inventory_level.location_id,
            available: providerResponse.inventory_level.available,
            updated_at: providerResponse.inventory_level.updated_at,
            ...(providerResponse.inventory_level.variant_id != null && { variant_id: providerResponse.inventory_level.variant_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
