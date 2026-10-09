import { z } from 'zod';
import { createAction } from 'nango';

const FilterBySchema = z.enum([
    'Status.All',
    'Status.Active',
    'Status.Inactive',
    'Status.Lowstock',
    'Status.Unmapped',
    'Status.Uncategorized',
    'Status.Grouped',
    'ItemType.All',
    'ItemType.Sales',
    'ItemType.Purchases',
    'ItemType.SalesAndPurchases',
    'ItemType.Inventory',
    'ItemType.NonInventory',
    'ItemType.Service'
]);

const SortColumnSchema = z.enum(['name', 'sku', 'rate', 'purchase_rate', 'created_time', 'last_modified_time', 'reorder_level', 'stock_on_hand']);

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho Inventory organization to list items from. Example: "927270289"'),
        page: z.number().int().positive().optional().describe('Page number to fetch. Must be a positive integer. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of items to fetch per page. Must be a positive integer. Defaults to 200.'),
        search_text: z.string().optional().describe('Free-text search across searchable item fields such as name and SKU.'),
        filter_by: FilterBySchema.optional().describe('Predefined status or item-type filter, e.g. "Status.Active" or "ItemType.Inventory".'),
        status: z.enum(['active', 'inactive']).optional().describe('Filter items by status.'),
        name: z.string().optional().describe('Filter by exact item name.'),
        name_startswith: z.string().optional().describe('Filter by item name that starts with the given value.'),
        name_contains: z.string().optional().describe('Filter by item name that contains the given value.'),
        sku: z.string().optional().describe('Filter by exact SKU.'),
        sku_startswith: z.string().optional().describe('Filter by SKU that starts with the given value.'),
        sku_contains: z.string().optional().describe('Filter by SKU that contains the given value.'),
        rate: z.number().optional().describe('Filter by exact selling rate.'),
        rate_less_than: z.number().optional().describe('Filter by selling rate less than the given value.'),
        rate_less_equals: z.number().optional().describe('Filter by selling rate less than or equal to the given value.'),
        rate_greater_than: z.number().optional().describe('Filter by selling rate greater than the given value.'),
        rate_greater_equals: z.number().optional().describe('Filter by selling rate greater than or equal to the given value.'),
        purchase_rate: z.number().optional().describe('Filter by exact purchase rate.'),
        purchase_rate_less_than: z.number().optional().describe('Filter by purchase rate less than the given value.'),
        purchase_rate_less_equals: z.number().optional().describe('Filter by purchase rate less than or equal to the given value.'),
        purchase_rate_greater_than: z.number().optional().describe('Filter by purchase rate greater than the given value.'),
        purchase_rate_greater_equals: z.number().optional().describe('Filter by purchase rate greater than or equal to the given value.'),
        tax_id: z.string().optional().describe('Filter by tax ID.'),
        account_id: z.string().optional().describe('Filter by sales account ID.'),
        purchase_account_id: z.string().optional().describe('Filter by purchase account ID.'),
        customview_id: z.string().optional().describe('ID of a custom view to apply to the results.'),
        vendor_id: z.string().optional().describe('Filter by vendor ID.'),
        item_id: z.string().optional().describe('Filter by item ID.'),
        zcrm_product_id: z.string().optional().describe('Filter by linked Zoho CRM product ID.'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return items modified at or after this time. Use Zoho\'s numeric-offset format with no colon, e.g. "2026-10-09T13:20:00-0400".'),
        category_id: z.string().optional().describe('Filter by category ID.'),
        brand_ids: z.string().optional().describe('Comma-separated list of brand IDs to filter by.'),
        manufacturer_ids: z.string().optional().describe('Comma-separated list of manufacturer IDs to filter by.'),
        warehouse_id: z.string().optional().describe('Filter by warehouse ID.'),
        location_id: z.string().optional().describe('Filter by location ID.'),
        group_id: z.string().optional().describe('Filter by item group ID.'),
        sort_column: SortColumnSchema.optional().describe('Column to sort the results by.'),
        sort_order: z.enum(['A', 'D']).optional().describe('Sort direction: "A" for ascending, "D" for descending.')
    })
    .describe('Filters and pagination parameters for listing inventory items.');

const ItemSchema = z.object({
    item_id: z.string().describe('Unique identifier of the item.'),
    name: z.string().describe('Name of the item.'),
    item_name: z.string().optional().describe('Display name of the item, usually identical to name.'),
    status: z.string().optional().describe('Item status: "active" or "inactive".'),
    item_type: z
        .string()
        .optional()
        .describe('How the item can be used: "sales", "purchases", "sales_and_purchases", "inventory", "non_inventory", or "service".'),
    product_type: z.string().optional().describe('Product type, typically "goods" or "service".'),
    sku: z.string().optional().describe('Stock keeping unit code of the item.'),
    upc: z.string().optional().describe('Universal Product Code of the item.'),
    ean: z.string().optional().describe('European Article Number of the item.'),
    isbn: z.string().optional().describe('ISBN of the item.'),
    part_number: z.string().optional().describe('Part number of the item.'),
    unit: z.string().optional().describe('Unit of measurement, e.g. "qty" or "hour".'),
    description: z.string().optional().describe('Sales description of the item.'),
    purchase_description: z.string().optional().describe('Purchase description of the item.'),
    rate: z.number().optional().describe('Selling price of the item.'),
    purchase_rate: z.number().optional().describe('Purchase price of the item.'),
    is_taxable: z.boolean().optional().describe('Whether the item is taxable.'),
    tax_id: z.string().optional().describe('ID of the tax applied to the item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the item.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the item.'),
    account_id: z.string().optional().describe('ID of the sales account associated with the item.'),
    account_name: z.string().optional().describe('Name of the sales account associated with the item.'),
    purchase_account_id: z.string().optional().describe('ID of the purchase account associated with the item.'),
    purchase_account_name: z.string().optional().describe('Name of the purchase account associated with the item.'),
    category_id: z.string().optional().describe('ID of the category the item belongs to.'),
    category_name: z.string().optional().describe('Name of the category the item belongs to.'),
    group_id: z.string().optional().describe('ID of the item group (item master) the item belongs to, if any.'),
    group_name: z.string().optional().describe('Name of the item group the item belongs to, if any.'),
    vendor_id: z.string().optional().describe('ID of the preferred vendor for the item.'),
    vendor_name: z.string().optional().describe('Name of the preferred vendor for the item.'),
    stock_on_hand: z.number().optional().describe('Quantity of the item currently in stock.'),
    reorder_level: z.number().optional().describe('Stock level at which the item should be reordered.'),
    can_be_sold: z.boolean().optional().describe('Whether the item can be used on sales transactions.'),
    can_be_purchased: z.boolean().optional().describe('Whether the item can be used on purchase transactions.'),
    track_inventory: z.boolean().optional().describe('Whether inventory is tracked for the item.'),
    brand: z.string().optional().describe('Brand of the item.'),
    manufacturer: z.string().optional().describe('Manufacturer of the item.'),
    created_time: z.string().optional().describe('Time the item was created in Zoho offset format, e.g. "2026-06-09T09:45:44-0400".'),
    last_modified_time: z.string().optional().describe('Time the item was last modified in Zoho offset format, e.g. "2026-06-09T09:45:44-0400".')
});

const PageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    items: z.array(ItemSchema),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        items: z.array(ItemSchema).describe('Items matching the supplied filters on the requested page.'),
        page: z.number().optional().describe('Page number of the returned results.'),
        per_page: z.number().optional().describe('Number of records returned per page.'),
        has_more_page: z.boolean().optional().describe('Whether more items are available beyond this page.'),
        next_page: z.number().optional().describe('Page number to request next; present only when has_more_page is true.')
    })
    .describe('A page of inventory items matching the filters, with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists items from the provider without creating, modifying, or deleting any data.
 * @pitfalls: last_modified_time accepts only Zoho's numeric-offset timestamp format with no colon (e.g. "2026-10-09T13:20:00-0400") — a literal-Z UTC value or bare date is rejected — and is applied as an inclusive lower bound on modification time.
 */
const action = createAction({
    description: 'List inventory items (products/services) with filtering by status, category, SKU, and modification time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/items/#list-all-the-items
            endpoint: '/inventory/v1/items',
            params: {
                organization_id: input.organization_id,
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.search_text !== undefined && { search_text: input.search_text }),
                ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.name_startswith !== undefined && { name_startswith: input.name_startswith }),
                ...(input.name_contains !== undefined && { name_contains: input.name_contains }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.sku_startswith !== undefined && { sku_startswith: input.sku_startswith }),
                ...(input.sku_contains !== undefined && { sku_contains: input.sku_contains }),
                ...(input.rate !== undefined && { rate: input.rate }),
                ...(input.rate_less_than !== undefined && { rate_less_than: input.rate_less_than }),
                ...(input.rate_less_equals !== undefined && { rate_less_equals: input.rate_less_equals }),
                ...(input.rate_greater_than !== undefined && { rate_greater_than: input.rate_greater_than }),
                ...(input.rate_greater_equals !== undefined && { rate_greater_equals: input.rate_greater_equals }),
                ...(input.purchase_rate !== undefined && { purchase_rate: input.purchase_rate }),
                ...(input.purchase_rate_less_than !== undefined && { purchase_rate_less_than: input.purchase_rate_less_than }),
                ...(input.purchase_rate_less_equals !== undefined && { purchase_rate_less_equals: input.purchase_rate_less_equals }),
                ...(input.purchase_rate_greater_than !== undefined && { purchase_rate_greater_than: input.purchase_rate_greater_than }),
                ...(input.purchase_rate_greater_equals !== undefined && { purchase_rate_greater_equals: input.purchase_rate_greater_equals }),
                ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
                ...(input.account_id !== undefined && { account_id: input.account_id }),
                ...(input.purchase_account_id !== undefined && { purchase_account_id: input.purchase_account_id }),
                ...(input.customview_id !== undefined && { customview_id: input.customview_id }),
                ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
                ...(input.item_id !== undefined && { item_id: input.item_id }),
                ...(input.zcrm_product_id !== undefined && { zcrm_product_id: input.zcrm_product_id }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.category_id !== undefined && { category_id: input.category_id }),
                ...(input.brand_ids !== undefined && { brand_ids: input.brand_ids }),
                ...(input.manufacturer_ids !== undefined && { manufacturer_ids: input.manufacturer_ids }),
                ...(input.warehouse_id !== undefined && { warehouse_id: input.warehouse_id }),
                ...(input.location_id !== undefined && { location_id: input.location_id }),
                ...(input.group_id !== undefined && { group_id: input.group_id }),
                ...(input.sort_column !== undefined && { sort_column: input.sort_column }),
                ...(input.sort_order !== undefined && { sort_order: input.sort_order })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const page = parsed.page_context?.page;
        const hasMorePage = parsed.page_context?.has_more_page;

        return {
            items: parsed.items,
            ...(page !== undefined && { page }),
            ...(parsed.page_context?.per_page !== undefined && { per_page: parsed.page_context.per_page }),
            ...(hasMorePage !== undefined && { has_more_page: hasMorePage }),
            ...(hasMorePage === true && page !== undefined && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
