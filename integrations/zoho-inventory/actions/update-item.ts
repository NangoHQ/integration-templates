import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const CustomFieldSchema = z.object({
    customfield_id: z.string().describe('Unique ID of the custom field to set. Example: "2608150000000123456"'),
    value: z.string().describe('New value for the custom field. Example: "Normal"'),
    label: z.string().optional().describe('Display label of the custom field.')
});

const LocationSchema = z.object({
    location_id: z.string().describe('ID of the location whose opening stock is being set. Example: "260815000000038080"'),
    initial_stock: z.number().optional().describe('Opening stock quantity for this location.'),
    initial_stock_rate: z.number().optional().describe('Opening stock value (rate) for this location.')
});

const InputSchema = z
    .object({
        item_id: z.string().describe('Unique identifier of the item to update. Example: "260815000000160173"'),
        organization_id: z.string().describe('ID of the Zoho Inventory organization the item belongs to. Example: "927270289"'),
        name: z.string().optional().describe('New name of the item.'),
        rate: z.number().optional().describe('Sales price of the item.'),
        purchase_rate: z.number().optional().describe('Purchase price of the item.'),
        description: z.string().optional().describe('Sales description of the item.'),
        purchase_description: z.string().optional().describe('Description shown to the vendor on purchase documents.'),
        sku: z.string().optional().describe('Stock Keeping Unit code, unique within the organization.'),
        unit: z.string().optional().describe('Unit of measurement for the item. Example: "qty"'),
        item_type: z.enum(['inventory', 'sales', 'purchases', 'sales_and_purchases']).optional().describe('Item type controlling where the item can be used.'),
        product_type: z.enum(['goods', 'service']).optional().describe('Whether the item is a physical good or a service.'),
        can_be_sold: z.boolean().optional().describe('Whether the item can be included on sales documents.'),
        can_be_purchased: z.boolean().optional().describe('Whether the item can be included on purchase documents.'),
        track_inventory: z.boolean().optional().describe('Whether inventory tracking is enabled for the item.'),
        is_taxable: z.boolean().optional().describe('Whether the item is taxable.'),
        tax_id: z.string().optional().describe('ID of the tax associated with the item. Example: "260815000000101234"'),
        tax_name: z.string().optional().describe('Name of the tax associated with the item.'),
        tax_percentage: z.number().optional().describe('Tax percentage applied to the item.'),
        tax_type: z.string().optional().describe('Type of tax associated with the item.'),
        reorder_level: z.number().optional().describe('Stock level at which the item should be reordered.'),
        vendor_id: z.string().optional().describe('ID of the preferred vendor for purchasing this item.'),
        vendor_name: z.string().optional().describe('Name of the preferred vendor for purchasing this item.'),
        brand: z.string().optional().describe('Brand of the item.'),
        manufacturer: z.string().optional().describe('Manufacturer of the item.'),
        upc: z.string().optional().describe('Universal Product Code of the item.'),
        ean: z.string().optional().describe('European Article Number of the item.'),
        isbn: z.string().optional().describe('ISBN of the item.'),
        part_number: z.string().optional().describe('Part number of the item.'),
        hsn_or_sac: z.string().optional().describe('HSN or SAC code of the item (India edition).'),
        purchase_account_id: z.string().optional().describe('ID of the purchase account for the item.'),
        inventory_account_id: z.string().optional().describe('ID of the inventory account for the item.'),
        status: z.enum(['active', 'inactive']).optional().describe('Status of the item.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields to set on the item.'),
        locations: z.array(LocationSchema).optional().describe('Location-specific opening stock details for the item.')
    })
    .describe('Fields to partially update on an existing Zoho Inventory item. Only the fields provided are changed.');

const ProviderItemSchema = z
    .object({
        item_id: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        item_type: z.string().optional(),
        product_type: z.string().optional(),
        rate: z.number().optional(),
        purchase_rate: z.number().optional(),
        can_be_sold: z.boolean().optional(),
        can_be_purchased: z.boolean().optional(),
        track_inventory: z.boolean().optional(),
        is_taxable: z.boolean().optional(),
        description: z.string().optional(),
        purchase_description: z.string().optional(),
        sku: z.string().optional(),
        unit: z.string().optional(),
        tax_id: z.union([z.string(), z.number()]).optional(),
        tax_name: z.string().optional(),
        tax_percentage: z.number().optional(),
        reorder_level: z.union([z.string(), z.number()]).optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        item_id: z.string().describe('Unique identifier of the updated item. Example: "260815000000160173"'),
        name: z.string().optional().describe('Name of the item after the update.'),
        status: z.string().optional().describe('Status of the item after the update. Example: "active"'),
        item_type: z.string().optional().describe('Item type after the update. Example: "sales_and_purchases"'),
        product_type: z.string().optional().describe('Product type after the update. Example: "service"'),
        rate: z.number().optional().describe('Sales price of the item after the update.'),
        purchase_rate: z.number().optional().describe('Purchase price of the item after the update.'),
        can_be_sold: z.boolean().optional().describe('Whether the item can be sold after the update.'),
        can_be_purchased: z.boolean().optional().describe('Whether the item can be purchased after the update.'),
        track_inventory: z.boolean().optional().describe('Whether inventory tracking is enabled after the update.'),
        is_taxable: z.boolean().optional().describe('Whether the item is taxable after the update.'),
        description: z.string().optional().describe('Sales description of the item after the update.'),
        purchase_description: z.string().optional().describe('Purchase description of the item after the update.'),
        sku: z.string().optional().describe('SKU of the item after the update.'),
        unit: z.string().optional().describe('Unit of measurement of the item after the update.'),
        tax_id: z.string().optional().describe('ID of the tax associated with the item after the update.'),
        tax_name: z.string().optional().describe('Name of the tax associated with the item after the update.'),
        tax_percentage: z.number().optional().describe('Tax percentage applied to the item after the update.'),
        reorder_level: z.number().optional().describe('Reorder level of the item after the update.'),
        created_time: z.string().optional().describe('Timestamp when the item was created. Example: "2026-10-09T14:25:15-0400"'),
        last_modified_time: z.string().optional().describe('Timestamp when the item was last modified. Example: "2026-10-09T14:25:15-0400"')
    })
    .describe('The item as returned by Zoho Inventory after the partial update.');

/**
 * @tags: [write]
 * @tagReason: Partially updates an existing item through the provider's PUT endpoint, mutating provider state.
 * @pitfalls: Setting `purchase_rate` on an item created without `item_type: "sales_and_purchases"` does not make it purchasable (it silently stays 0.00 and `can_be_purchased` stays false), and `item_type` does not appear to be changeable through this action.
 */
const action = createAction({
    description: 'Partially update an existing item (price, tax, description, etc.).',
    version: '1.0.0',
    scopes: ['ZohoInventory.items.UPDATE'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.rate !== undefined && { rate: input.rate }),
            ...(input.purchase_rate !== undefined && { purchase_rate: input.purchase_rate }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.purchase_description !== undefined && { purchase_description: input.purchase_description }),
            ...(input.sku !== undefined && { sku: input.sku }),
            ...(input.unit !== undefined && { unit: input.unit }),
            ...(input.item_type !== undefined && { item_type: input.item_type }),
            ...(input.product_type !== undefined && { product_type: input.product_type }),
            ...(input.can_be_sold !== undefined && { can_be_sold: input.can_be_sold }),
            ...(input.can_be_purchased !== undefined && { can_be_purchased: input.can_be_purchased }),
            ...(input.track_inventory !== undefined && { track_inventory: input.track_inventory }),
            ...(input.is_taxable !== undefined && { is_taxable: input.is_taxable }),
            ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
            ...(input.tax_name !== undefined && { tax_name: input.tax_name }),
            ...(input.tax_percentage !== undefined && { tax_percentage: input.tax_percentage }),
            ...(input.tax_type !== undefined && { tax_type: input.tax_type }),
            ...(input.reorder_level !== undefined && { reorder_level: input.reorder_level }),
            ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
            ...(input.vendor_name !== undefined && { vendor_name: input.vendor_name }),
            ...(input.brand !== undefined && { brand: input.brand }),
            ...(input.manufacturer !== undefined && { manufacturer: input.manufacturer }),
            ...(input.upc !== undefined && { upc: input.upc }),
            ...(input.ean !== undefined && { ean: input.ean }),
            ...(input.isbn !== undefined && { isbn: input.isbn }),
            ...(input.part_number !== undefined && { part_number: input.part_number }),
            ...(input.hsn_or_sac !== undefined && { hsn_or_sac: input.hsn_or_sac }),
            ...(input.purchase_account_id !== undefined && { purchase_account_id: input.purchase_account_id }),
            ...(input.inventory_account_id !== undefined && { inventory_account_id: input.inventory_account_id }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.locations !== undefined && { locations: input.locations })
        };

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/items/#update-an-item
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data,
            retries: 3
        };

        const response = await nango.put(config);

        if (!response.data || !response.data.item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The item could not be updated or was not found.',
                item_id: input.item_id
            });
        }

        const providerItem = ProviderItemSchema.parse(response.data.item);

        return {
            item_id: input.item_id,
            ...(providerItem.name != null && { name: providerItem.name }),
            ...(providerItem.status != null && { status: providerItem.status }),
            ...(providerItem.item_type != null && { item_type: providerItem.item_type }),
            ...(providerItem.product_type != null && { product_type: providerItem.product_type }),
            ...(providerItem.rate != null && { rate: providerItem.rate }),
            ...(providerItem.purchase_rate != null && { purchase_rate: providerItem.purchase_rate }),
            ...(providerItem.can_be_sold != null && { can_be_sold: providerItem.can_be_sold }),
            ...(providerItem.can_be_purchased != null && { can_be_purchased: providerItem.can_be_purchased }),
            ...(providerItem.track_inventory != null && { track_inventory: providerItem.track_inventory }),
            ...(providerItem.is_taxable != null && { is_taxable: providerItem.is_taxable }),
            ...(providerItem.description != null && { description: providerItem.description }),
            ...(providerItem.purchase_description != null && { purchase_description: providerItem.purchase_description }),
            ...(providerItem.sku != null && { sku: providerItem.sku }),
            ...(providerItem.unit != null && { unit: providerItem.unit }),
            ...(providerItem.tax_id != null && { tax_id: String(providerItem.tax_id) }),
            ...(providerItem.tax_name != null && { tax_name: providerItem.tax_name }),
            ...(providerItem.tax_percentage != null && { tax_percentage: providerItem.tax_percentage }),
            ...(providerItem.reorder_level != null && { reorder_level: Number(providerItem.reorder_level) }),
            ...(providerItem.created_time != null && { created_time: providerItem.created_time }),
            ...(providerItem.last_modified_time != null && { last_modified_time: providerItem.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
