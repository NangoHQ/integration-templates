import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const IdValue = z.union([z.string(), z.number()]);
const NumberValue = z.union([z.number(), z.string()]);

const LocationSchema = z.object({
    location_id: IdValue.optional().describe('Unique identifier of the stock location.'),
    location_name: z.string().optional().describe('Display name of the stock location.'),
    status: z.string().optional().describe('Status of the location. Example: "active"'),
    is_primary: z.boolean().optional().describe('Whether this is the primary location of the organization.'),
    location_stock_on_hand: NumberValue.optional().describe('Quantity of this item on hand at the location.'),
    location_available_stock: NumberValue.optional().describe('Committed-adjusted quantity available to sell at the location.'),
    location_actual_available_stock: NumberValue.optional().describe('Actual available quantity at the location, ignoring pending adjustments.')
});

const CustomFieldSchema = z.object({
    customfield_id: IdValue.optional().describe('Unique identifier of the custom field.'),
    label: z.string().optional().describe('Display label of the custom field.'),
    value: z.union([z.string(), z.number(), z.boolean()]).optional().describe('Value stored in the custom field.')
});

const InputSchema = z
    .object({
        item_id: z.string().describe('Unique identifier of the Zoho Inventory item to retrieve. Example: "260815000000101002"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies which item to fetch and, optionally, the organization that owns it.');

const OutputSchema = z
    .object({
        item_id: IdValue.describe('Unique identifier of the item.'),
        name: z.string().describe('Name of the item.'),
        sku: z.string().optional().describe('Stock keeping unit code of the item, if set.'),
        brand: z.string().optional().describe('Brand of the item, if set.'),
        manufacturer: z.string().optional().describe('Manufacturer of the item, if set.'),
        status: z.string().optional().describe('Lifecycle status of the item. Example: "active"'),
        item_type: z.string().optional().describe('Supported transaction type. Example: "sales", "purchases", "sales_and_purchases"'),
        product_type: z.string().optional().describe('Nature of the product. Example: "goods", "service"'),
        source: z.string().optional().describe('Origin of the item record. Example: "api"'),
        description: z.string().optional().describe('Sales description of the item.'),
        purchase_description: z.string().optional().describe('Purchase description of the item.'),
        unit: z.string().optional().describe('Unit of measurement name. Example: "hour"'),
        unit_id: IdValue.optional().describe('Unique identifier of the unit of measurement.'),
        group_id: IdValue.optional().describe('Unique identifier of the item group, when the item belongs to a group.'),
        group_name: z.string().optional().describe('Name of the item group, when the item belongs to a group.'),
        category_id: IdValue.optional().describe('Unique identifier of the category the item belongs to.'),
        category_name: z.string().optional().describe('Name of the category the item belongs to.'),
        rate: NumberValue.optional().describe('Selling price per unit.'),
        sales_rate: NumberValue.optional().describe('Selling price per unit used on sales transactions.'),
        purchase_rate: NumberValue.optional().describe('Purchase cost per unit.'),
        pricebook_rate: NumberValue.optional().describe('Price configured in the default price book.'),
        pricing_scheme: z.string().optional().describe('Pricing model of the item. Example: "unit", "volume"'),
        account_id: IdValue.optional().describe('Unique identifier of the sales account.'),
        account_name: z.string().optional().describe('Name of the sales account.'),
        purchase_account_id: IdValue.optional().describe('Unique identifier of the purchase account.'),
        purchase_account_name: z.string().optional().describe('Name of the purchase account.'),
        inventory_account_id: IdValue.optional().describe('Unique identifier of the inventory asset account.'),
        inventory_account_name: z.string().optional().describe('Name of the inventory asset account.'),
        vendor_id: IdValue.optional().describe('Unique identifier of the preferred vendor, if configured.'),
        vendor_name: z.string().optional().describe('Name of the preferred vendor, if configured.'),
        is_taxable: z.boolean().optional().describe('Whether the item is taxable.'),
        tax_id: IdValue.optional().describe('Unique identifier of the tax rate applied to the item.'),
        tax_name: z.string().optional().describe('Name of the tax rate applied to the item.'),
        tax_percentage: NumberValue.optional().describe('Tax percentage applied to the item.'),
        tax_type: z.string().optional().describe('Type of the tax applied to the item.'),
        can_be_sold: z.boolean().optional().describe('Whether the item can be used on sales transactions.'),
        can_be_purchased: z.boolean().optional().describe('Whether the item can be used on purchase transactions.'),
        track_inventory: z.boolean().optional().describe('Whether inventory is tracked for this item.'),
        is_returnable: z.boolean().optional().describe('Whether the item can be returned.'),
        reorder_level: NumberValue.optional().describe('Stock level at which the item should be reordered.'),
        stock_on_hand: NumberValue.optional().describe('Total quantity currently on hand. Only present for inventory-tracked items.'),
        available_stock: NumberValue.optional().describe('Quantity available to sell. Only present for inventory-tracked items.'),
        actual_available_stock: NumberValue.optional().describe('Actual available quantity. Only present for inventory-tracked items.'),
        locations: z.array(LocationSchema).optional().describe('Per-location stock breakdown for inventory-tracked items.'),
        upc: IdValue.optional().describe('Universal Product Code of the item.'),
        ean: IdValue.optional().describe('European Article Number of the item.'),
        isbn: IdValue.optional().describe('International Standard Book Number of the item.'),
        part_number: IdValue.optional().describe('Manufacturer part number of the item.'),
        image_name: z.string().optional().describe('File name of the item image.'),
        image_type: z.string().optional().describe('File type of the item image. Example: "jpg"'),
        is_combo_product: z.boolean().optional().describe('Whether the item is a composite/kit item.'),
        has_variant: z.boolean().optional().describe('Whether the item has one or more variants.'),
        created_time: z.string().optional().describe('Timestamp when the item was created. Example: "2026-06-09T09:45:44-0400"'),
        last_modified_time: z.string().optional().describe('Timestamp when the item was last modified. Example: "2026-06-09T09:45:44-0400"'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values defined on the item.')
    })
    .describe('Full detail of a single Zoho Inventory item, including pricing and stock information.');

const ProviderItemResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    item: z.unknown().optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves item details from the provider and does not modify any provider data.
 * @pitfalls: Looking up a missing or deleted item fails with the provider's 404 error instead of returning an empty result. Stock levels (stock_on_hand, available_stock, actual_available_stock, locations) are only returned for inventory-tracked items, and unset text/ID fields typically come back as empty strings rather than being omitted.
 */
const action = createAction({
    description: 'Get full details for one item by ID, including stock levels and pricing.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/items/#retrieve-an-item
        const response = await nango.get({
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const envelope = ProviderItemResponseSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when retrieving item.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory returned an error while retrieving the item.',
                code: envelope.data.code
            });
        }

        const item = OutputSchema.safeParse(envelope.data.item);
        if (!item.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected item payload from Zoho Inventory API.',
                details: item.error.message
            });
        }

        return item.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
