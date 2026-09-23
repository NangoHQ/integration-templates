import { z } from 'zod';
import { createAction } from 'nango';

const ProviderInventoryItemSchema = z.object({
    id: z.string(),
    variant_id: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    cost: z.string().nullable().optional(),
    tracked: z.boolean().nullable().optional(),
    required_shipping: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const InventoryItemSchema = z.object({
    id: z.string().describe('Inventory item ID. Example: "7683107486941858847"'),
    variant_id: z.string().optional().describe('Associated product variant ID. Example: "18076831074843245979951755"'),
    sku: z.string().optional().describe('Stock keeping unit code for the variant.'),
    cost: z.string().optional().describe('Unit cost amount as a string. Example: "419.80"'),
    tracked: z.boolean().optional().describe('Whether inventory tracking is enabled for this item.'),
    required_shipping: z.boolean().optional().describe('Whether the item requires shipping.'),
    created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
    updated_at: z.string().optional().describe('ISO 8601 last update timestamp.')
});

const InputSchema = z
    .object({
        ids: z.string().describe('Comma-separated inventory item IDs to retrieve. Example: "7683107486941858849,7683107486941858847"')
    })
    .describe('Input for retrieving inventory items by their IDs.');

const OutputSchema = z
    .object({
        inventory_items: z.array(InventoryItemSchema).describe('List of inventory items matching the requested IDs.')
    })
    .describe('Output containing the retrieved inventory items.');

/**
 * @tags: [read]
 * @tagReason: Retrieves inventory items by ID from the provider.
 * @pitfalls: The provider only supports lookup by inventory item IDs; there is no SKU-based filter, so callers must already know the IDs they want to query.
 */
const action = createAction({
    description: 'Retrieve inventory items by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/inventory/inventory-items
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/inventory_items.json',
            params: {
                ids: input.ids
            },
            retries: 3
        });

        const rawItems = response.data;

        const parsed = z
            .object({
                inventory_items: z.array(z.unknown())
            })
            .parse(rawItems);

        const inventoryItems = parsed.inventory_items.map((item) => {
            const providerItem = ProviderInventoryItemSchema.parse(item);
            return {
                id: providerItem.id,
                ...(providerItem.variant_id != null && { variant_id: providerItem.variant_id }),
                ...(providerItem.sku != null && { sku: providerItem.sku }),
                ...(providerItem.cost != null && { cost: providerItem.cost }),
                ...(providerItem.tracked != null && { tracked: providerItem.tracked }),
                ...(providerItem.required_shipping != null && { required_shipping: providerItem.required_shipping }),
                ...(providerItem.created_at != null && { created_at: providerItem.created_at }),
                ...(providerItem.updated_at != null && { updated_at: providerItem.updated_at })
            };
        });

        return {
            inventory_items: inventoryItems
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
