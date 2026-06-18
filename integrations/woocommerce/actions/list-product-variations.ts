import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ProviderImageSchema = z
    .object({
        id: z.number().optional(),
        date_created: z.string().optional(),
        date_created_gmt: z.string().optional(),
        date_modified: z.string().optional(),
        date_modified_gmt: z.string().optional(),
        src: z.string().optional(),
        name: z.string().optional(),
        alt: z.string().optional()
    })
    .passthrough();

const ProviderAttributeSchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional(),
        option: z.string().optional()
    })
    .passthrough();

const ProviderVariationSchema = z
    .object({
        id: z.number(),
        date_created: z.string().optional(),
        date_created_gmt: z.string().optional(),
        date_modified: z.string().optional(),
        date_modified_gmt: z.string().optional(),
        description: z.string().optional(),
        permalink: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().optional(),
        regular_price: z.string().optional(),
        sale_price: z.string().nullable().optional(),
        date_on_sale_from: z.string().nullable().optional(),
        date_on_sale_from_gmt: z.string().nullable().optional(),
        date_on_sale_to: z.string().nullable().optional(),
        date_on_sale_to_gmt: z.string().nullable().optional(),
        on_sale: z.boolean().optional(),
        status: z.string().optional(),
        purchasable: z.boolean().optional(),
        virtual: z.boolean().optional(),
        downloadable: z.boolean().optional(),
        downloads: z.array(z.unknown()).nullable().optional(),
        download_limit: z.number().optional(),
        download_expiry: z.number().optional(),
        tax_status: z.string().optional(),
        tax_class: z.string().optional(),
        manage_stock: z.boolean().optional(),
        stock_quantity: z.number().nullable().optional(),
        stock_status: z.string().optional(),
        backorders: z.string().optional(),
        backorders_allowed: z.boolean().optional(),
        backordered: z.boolean().optional(),
        weight: z.string().optional(),
        dimensions: z
            .object({
                length: z.string().optional(),
                width: z.string().optional(),
                height: z.string().optional()
            })
            .nullable()
            .optional(),
        shipping_class: z.string().optional(),
        shipping_class_id: z.number().optional(),
        image: ProviderImageSchema.nullable().optional(),
        attributes: z.array(ProviderAttributeSchema).nullable().optional(),
        menu_order: z.number().optional(),
        meta_data: z.array(z.unknown()).nullable().optional(),
        _links: z.unknown().optional()
    })
    .passthrough();

const InputSchema = z.object({
    product_id: z.number().int().positive().describe('Product ID. Example: 13'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Maximum number of items to be returned in result set. Default is 10.'),
    context: z.string().optional().describe('Scope under which the request is made; determines fields present in response. Options: view, edit.'),
    search: z.string().optional().describe('Limit results to those matching a string.'),
    after: z.string().optional().describe('Limit response to resources published after a given ISO8601 compliant date.'),
    before: z.string().optional().describe('Limit response to resources published before a given ISO8601 compliant date.'),
    dates_are_gmt: z.boolean().optional().describe('Interpret after and before as UTC dates when true.'),
    exclude: z.array(z.number()).optional().describe('Ensure result set excludes specific IDs.'),
    include: z.array(z.number()).optional().describe('Limit result set to specific ids.'),
    offset: z.number().optional().describe('Offset the result set by a specific number of items.'),
    order: z.string().optional().describe('Order sort attribute ascending or descending. Options: asc, desc.'),
    orderby: z.string().optional().describe('Sort collection by object attribute. Options: date, modified, id, include, title, slug.'),
    parent: z.array(z.number()).optional().describe('Limit result set to those of particular parent IDs.'),
    parent_exclude: z.array(z.number()).optional().describe('Limit result set to all items except those of a particular parent ID.'),
    slug: z.string().optional().describe('Limit result set to products with a specific slug.'),
    status: z.string().optional().describe('Limit result set to products assigned a specific status. Options: any, draft, pending, private, publish.'),
    include_status: z.string().optional().describe('Limit result set to product variations with any of the specified statuses.'),
    exclude_status: z.string().optional().describe('Exclude product variations from result set with any of the specified statuses.'),
    sku: z.string().optional().describe('Limit result set to products with a specific SKU.'),
    tax_class: z.string().optional().describe('Limit result set to products with a specific tax class.'),
    on_sale: z.boolean().optional().describe('Limit result set to products on sale.'),
    min_price: z.string().optional().describe('Limit result set to products based on a minimum price.'),
    max_price: z.string().optional().describe('Limit result set to products based on a maximum price.'),
    stock_status: z.string().optional().describe('Limit result set to products with specified stock status. Options: instock, outofstock, onbackorder.'),
    virtual: z.boolean().optional().describe('Limit result set to virtual product variations.'),
    downloadable: z.boolean().optional().describe('Limit result set to downloadable product variations.')
});

const OutputSchema = z.object({
    items: z.array(ProviderVariationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List product variations from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const params = {
            page,
            ...(input.per_page !== undefined && { per_page: input.per_page }),
            ...(input.context !== undefined && { context: input.context }),
            ...(input.search !== undefined && { search: input.search }),
            ...(input.after !== undefined && { after: input.after }),
            ...(input.before !== undefined && { before: input.before }),
            ...(input.dates_are_gmt !== undefined && { dates_are_gmt: input.dates_are_gmt ? 'true' : 'false' }),
            ...(input.exclude !== undefined && { exclude: input.exclude }),
            ...(input.include !== undefined && { include: input.include }),
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.order !== undefined && { order: input.order }),
            ...(input.orderby !== undefined && { orderby: input.orderby }),
            ...(input.parent !== undefined && { parent: input.parent }),
            ...(input.parent_exclude !== undefined && { parent_exclude: input.parent_exclude }),
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.include_status !== undefined && { include_status: input.include_status }),
            ...(input.exclude_status !== undefined && { exclude_status: input.exclude_status }),
            ...(input.sku !== undefined && { sku: input.sku }),
            ...(input.tax_class !== undefined && { tax_class: input.tax_class }),
            ...(input.on_sale !== undefined && { on_sale: input.on_sale ? 'true' : 'false' }),
            ...(input.min_price !== undefined && { min_price: input.min_price }),
            ...(input.max_price !== undefined && { max_price: input.max_price }),
            ...(input.stock_status !== undefined && { stock_status: input.stock_status }),
            ...(input.virtual !== undefined && { virtual: input.virtual ? 'true' : 'false' }),
            ...(input.downloadable !== undefined && { downloadable: input.downloadable ? 'true' : 'false' })
        };

        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-variations
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.product_id))}/variations`,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const itemsValidation = z.array(z.unknown()).safeParse(response.data);
        if (!itemsValidation.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of product variations from the provider.'
            });
        }

        const items = itemsValidation.data.map((item) => {
            const parsed = ProviderVariationSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'A product variation in the response did not match the expected schema.'
                });
            }
            return parsed.data;
        });

        const totalPagesHeader = response.headers['x-wp-totalpages'];
        const totalPages = typeof totalPagesHeader === 'string' ? parseInt(totalPagesHeader, 10) : NaN;
        const hasNextPage = !Number.isNaN(totalPages) && page < totalPages;
        const next_cursor = hasNextPage ? String(page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
