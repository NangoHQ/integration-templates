import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        inventory_item_id: z.string().describe('The unique identifier of the inventory item to retrieve.')
    })
    .describe('Input for retrieving a single inventory item by ID.');

const ProviderInventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().nullable().optional(),
    variant_id: z.string().nullable().optional(),
    tracked: z.boolean().nullable().optional(),
    required_shipping: z.boolean().nullable().optional(),
    cost: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the inventory item.'),
        sku: z.string().optional().describe('The stock keeping unit of the inventory item.'),
        variant_id: z.string().optional().describe('The unique identifier of the associated product variant.'),
        tracked: z.boolean().optional().describe('Whether inventory tracking is enabled for this item.'),
        required_shipping: z.boolean().optional().describe('Whether the item requires shipping.'),
        cost: z.string().optional().describe('The unit cost of the inventory item.'),
        created_at: z.string().optional().describe('The date and time when the inventory item was created.'),
        updated_at: z.string().optional().describe('The date and time when the inventory item was last updated.')
    })
    .describe('Output containing a single inventory item.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single inventory item by ID from the provider.
 * @pitfalls: Inventory level adjustments for this item will fail if the returned tracked field is false; it must first be enabled before any adjust or set operations can succeed.
 */
const action = createAction({
    description: 'Retrieve a single inventory item by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/inventory-item
            endpoint: `/admin/openapi/v20260601/inventory_items/${encodeURIComponent(input.inventory_item_id)}.json`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('inventory_item' in raw)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Inventory item not found or unexpected response format.',
                inventory_item_id: input.inventory_item_id
            });
        }

        const inventoryItem = raw.inventory_item;
        if (!inventoryItem || typeof inventoryItem !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Inventory item not found.',
                inventory_item_id: input.inventory_item_id
            });
        }

        const parsed = ProviderInventoryItemSchema.parse(inventoryItem);

        return {
            id: parsed.id,
            ...(parsed.sku != null && { sku: parsed.sku }),
            ...(parsed.variant_id != null && { variant_id: parsed.variant_id }),
            ...(parsed.tracked != null && { tracked: parsed.tracked }),
            ...(parsed.required_shipping != null && { required_shipping: parsed.required_shipping }),
            ...(parsed.cost != null && { cost: parsed.cost }),
            ...(parsed.created_at != null && { created_at: parsed.created_at }),
            ...(parsed.updated_at != null && { updated_at: parsed.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
