import { z } from 'zod';
import { createAction } from 'nango';

const ImageSchema = z.object({
    id: z.number().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    src: z.string().optional(),
    name: z.string().optional(),
    alt: z.string().optional()
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    parent: z.number(),
    description: z.string(),
    display: z.string(),
    image: z
        .union([z.array(z.unknown()), ImageSchema])
        .nullable()
        .optional(),
    menu_order: z.number(),
    count: z.number()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Maximum number of items to return. Default is 10.'),
    order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending. Default is asc.'),
    orderby: z
        .enum(['id', 'include', 'name', 'slug', 'term_group', 'description', 'count'])
        .optional()
        .describe('Sort collection by resource attribute. Default is name.'),
    hide_empty: z.boolean().optional().describe('Whether to hide resources not assigned to any products. Default is false.'),
    parent: z.number().optional().describe('Limit result set to resources assigned to a specific parent ID.'),
    product: z.number().optional().describe('Limit result set to resources assigned to a specific product ID.'),
    slug: z.string().optional().describe('Limit result set to resources with a specific slug.'),
    search: z.string().optional().describe('Limit results to those matching a string.')
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List product categories from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-product-categories',
        group: 'Product Categories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor format. Cursor must be a positive integer representing the page number.'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }
        if (input.orderby !== undefined) {
            params['orderby'] = input.orderby;
        }
        if (input.hide_empty !== undefined) {
            params['hide_empty'] = input.hide_empty ? 'true' : 'false';
        }
        if (input.parent !== undefined) {
            params['parent'] = input.parent;
        }
        if (input.product !== undefined) {
            params['product'] = input.product;
        }
        if (input.slug !== undefined) {
            params['slug'] = input.slug;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-categories
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/products/categories',
            params: params,
            retries: 3
        });

        const categories = z.array(CategorySchema).parse(response.data);

        const totalPagesHeader = response.headers['x-wp-totalpages'];
        const totalPages = totalPagesHeader ? parseInt(String(totalPagesHeader), 10) : 0;

        const hasMorePages = page < totalPages;

        return {
            categories: categories,
            ...(hasMorePages && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
