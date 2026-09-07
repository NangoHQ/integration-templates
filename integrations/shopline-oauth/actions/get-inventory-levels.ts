import { z } from 'zod';
import { createAction } from 'nango';

const InventoryLevelSchema = z.object({
    available: z.number().describe('Available quantity at this location.'),
    inventory_item_id: z.string().describe('Inventory item ID.'),
    location_id: z.string().describe('Location ID.'),
    updated_at: z.string().describe('Last updated timestamp in ISO 8601 format.'),
    variant_id: z.string().describe('Product variant ID associated with this inventory item.')
});

const InputSchema = z
    .object({
        inventory_item_ids: z.array(z.string().describe('Inventory item ID to query.')).describe('Inventory item IDs to retrieve levels for. Required.'),
        location_ids: z.array(z.string().describe('Location ID to scope results to.')).optional().describe('Optional location IDs to filter inventory levels.')
    })
    .describe('Input for retrieving inventory levels for specific inventory items and optional locations.');

const OutputSchema = z
    .object({
        inventory_levels: z.array(InventoryLevelSchema).describe('List of inventory levels for the requested items and locations.')
    })
    .describe('Output containing inventory levels for the requested inventory items and locations.');

/**
 * @tags: [read]
 * @tagReason: Retrieves inventory levels from the SHOPLINE Admin REST API without making any changes.
 * @pitfalls: The API has no global inventory-level listing; you must already know the inventory_item_ids to query, and only existing item-location pairs are returned.
 */
const action = createAction({
    description: 'Get available inventory quantities for inventory items, optionally scoped to locations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const inventoryItemIds = input.inventory_item_ids.join(',');
        const locationIds = input.location_ids ? input.location_ids.join(',') : undefined;

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/location/get-inventory-levels
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/inventory_levels.json',
            params: {
                inventory_item_ids: inventoryItemIds,
                ...(locationIds && { location_ids: locationIds })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            inventory_levels: z.array(
                z.object({
                    available: z.number(),
                    inventory_item_id: z.string(),
                    location_id: z.string(),
                    updated_at: z.string(),
                    variant_id: z.string()
                })
            )
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            inventory_levels: parsed.inventory_levels
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
