import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Maximum number of items to be returned. Default is 10.'),
    search: z.string().optional().describe('Limit results to those matching a string.'),
    status: z.string().optional().describe('Product status. Options: any, draft, pending, private, publish. Default is any.'),
    type: z.string().optional().describe('Product type. Options: simple, grouped, external, variable.'),
    category: z.string().optional().describe('Limit result set to products assigned a specific category ID.'),
    tag: z.string().optional().describe('Limit result set to products assigned a specific tag ID.'),
    sku: z.string().optional().describe('Limit result set to products with a specific SKU.'),
    min_price: z.string().optional().describe('Limit result set to products based on a minimum price.'),
    max_price: z.string().optional().describe('Limit result set to products based on a maximum price.'),
    orderby: z
        .string()
        .optional()
        .describe(
            'Sort collection by object attribute. Options: date, modified, id, include, title, slug, price, popularity, rating, menu_order. Default is date.'
        ),
    order: z.string().optional().describe('Order sort attribute ascending or descending. Options: asc, desc. Default is desc.'),
    stock_status: z.string().optional().describe('Limit result set to products with specified stock status. Options: instock, outofstock, onbackorder.'),
    featured: z.boolean().optional().describe('Limit result set to featured products.')
});

const ProductSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        slug: z.string().nullable().optional(),
        permalink: z.string().nullable().optional(),
        date_created: z.string().nullable().optional(),
        date_modified: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        featured: z.boolean().nullable().optional(),
        catalog_visibility: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        short_description: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        price: z.string().nullable().optional(),
        regular_price: z.string().nullable().optional(),
        sale_price: z.string().nullable().optional(),
        date_on_sale_from: z.string().nullable().optional(),
        date_on_sale_to: z.string().nullable().optional(),
        on_sale: z.boolean().nullable().optional(),
        purchasable: z.boolean().nullable().optional(),
        total_sales: z.number().nullable().optional(),
        virtual: z.boolean().nullable().optional(),
        downloadable: z.boolean().nullable().optional(),
        downloads: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        external_url: z.string().nullable().optional(),
        button_text: z.string().nullable().optional(),
        tax_status: z.string().nullable().optional(),
        tax_class: z.string().nullable().optional(),
        manage_stock: z.boolean().nullable().optional(),
        stock_quantity: z.number().nullable().optional(),
        stock_status: z.string().nullable().optional(),
        backorders: z.string().nullable().optional(),
        backorders_allowed: z.boolean().nullable().optional(),
        backordered: z.boolean().nullable().optional(),
        sold_individually: z.boolean().nullable().optional(),
        weight: z.string().nullable().optional(),
        dimensions: z.record(z.string(), z.unknown()).nullable().optional(),
        shipping_required: z.boolean().nullable().optional(),
        shipping_taxable: z.boolean().nullable().optional(),
        shipping_class: z.string().nullable().optional(),
        shipping_class_id: z.number().nullable().optional(),
        reviews_allowed: z.boolean().nullable().optional(),
        average_rating: z.string().nullable().optional(),
        rating_count: z.number().nullable().optional(),
        related_ids: z.array(z.number()).nullable().optional(),
        upsell_ids: z.array(z.number()).nullable().optional(),
        cross_sell_ids: z.array(z.number()).nullable().optional(),
        parent_id: z.number().nullable().optional(),
        purchase_note: z.string().nullable().optional(),
        categories: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        tags: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        images: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        attributes: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        default_attributes: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        variations: z.array(z.number()).nullable().optional(),
        grouped_products: z.array(z.number()).nullable().optional(),
        menu_order: z.number().nullable().optional(),
        meta_data: z.array(z.record(z.string(), z.unknown())).nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProductSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List products from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-products',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-products
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/products',
            params: {
                page: page.toString(),
                ...(input.per_page !== undefined && { per_page: input.per_page.toString() }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.tag !== undefined && { tag: input.tag }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.min_price !== undefined && { min_price: input.min_price }),
                ...(input.max_price !== undefined && { max_price: input.max_price }),
                ...(input.orderby !== undefined && { orderby: input.orderby }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.stock_status !== undefined && { stock_status: input.stock_status }),
                ...(input.featured !== undefined && { featured: input.featured.toString() })
            },
            retries: 3
        });

        const products = z.array(z.unknown()).parse(response.data);
        const items = products.map((product) => ProductSchema.parse(product));

        let nextCursor: string | undefined;
        const totalPagesHeader = response.headers['X-WP-TotalPages'] || response.headers['x-wp-totalpages'];
        if (totalPagesHeader) {
            const totalPages = typeof totalPagesHeader === 'string' ? parseInt(totalPagesHeader, 10) : 0;
            if (!Number.isNaN(totalPages) && page < totalPages) {
                nextCursor = (page + 1).toString();
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
