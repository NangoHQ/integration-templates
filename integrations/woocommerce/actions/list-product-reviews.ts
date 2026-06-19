import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Maximum number of items to be returned in result set. Default is 10.'),
    search: z.string().optional().describe('Limit results to those matching a string.'),
    after: z.string().optional().describe('Limit response to reviews published after a given ISO8601 compliant date.'),
    before: z.string().optional().describe('Limit response to reviews published before a given ISO8601 compliant date.'),
    dates_are_gmt: z.boolean().optional().describe('Interpret after and before as UTC dates when true.'),
    exclude: z.array(z.number()).optional().describe('Ensure result set excludes specific IDs.'),
    include: z.array(z.number()).optional().describe('Limit result set to specific IDs.'),
    offset: z.number().optional().describe('Offset the result set by a specific number of items.'),
    order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending. Default is desc.'),
    orderby: z
        .enum(['date', 'date_gmt', 'id', 'slug', 'include', 'product'])
        .optional()
        .describe('Sort collection by resource attribute. Default is date_gmt.'),
    reviewer: z.array(z.number()).optional().describe('Limit result set to reviews assigned to specific user IDs.'),
    reviewer_exclude: z.array(z.number()).optional().describe('Ensure result set excludes reviews assigned to specific user IDs.'),
    reviewer_email: z.array(z.string()).optional().describe('Limit result set to that from a specific author email.'),
    product: z.array(z.number()).optional().describe('Limit result set to reviews assigned to specific product IDs.'),
    status: z
        .enum(['all', 'hold', 'approved', 'spam', 'trash'])
        .optional()
        .describe('Limit result set to reviews assigned a specific status. Default is approved.')
});

const ProductReviewSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    product_id: z.number().optional(),
    status: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional(),
    reviewer_avatar_urls: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(ProductReviewSchema),
    next_cursor: z.string().optional()
});

function getHeaderValue(headers: unknown, name: string): string | undefined {
    if (headers !== null && typeof headers === 'object') {
        const entries = Object.entries(headers);
        for (const [key, value] of entries) {
            if (key === name && typeof value === 'string') {
                return value;
            }
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List product reviews from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const params = {
            page: page,
            ...(input.per_page !== undefined && { per_page: input.per_page }),
            ...(input.search !== undefined && { search: input.search }),
            ...(input.after !== undefined && { after: input.after }),
            ...(input.before !== undefined && { before: input.before }),
            ...(input.dates_are_gmt !== undefined && { dates_are_gmt: input.dates_are_gmt ? 'true' : 'false' }),
            ...(input.exclude !== undefined && { exclude: input.exclude }),
            ...(input.include !== undefined && { include: input.include }),
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.order !== undefined && { order: input.order }),
            ...(input.orderby !== undefined && { orderby: input.orderby }),
            ...(input.reviewer !== undefined && { reviewer: input.reviewer }),
            ...(input.reviewer_exclude !== undefined && { reviewer_exclude: input.reviewer_exclude }),
            ...(input.reviewer_email !== undefined && { reviewer_email: input.reviewer_email }),
            ...(input.product !== undefined && { product: input.product }),
            ...(input.status !== undefined && { status: input.status })
        };

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-product-reviews
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/products/reviews',
            params: params,
            retries: 3
        });

        const reviews = z.array(ProductReviewSchema).safeParse(response.data);
        if (!reviews.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse product reviews response'
            });
        }

        const totalPagesStr = getHeaderValue(response.headers, 'x-wp-totalpages');
        const totalPages = totalPagesStr ? parseInt(totalPagesStr, 10) : 0;
        const nextCursor = page < totalPages ? String(page + 1) : undefined;

        return {
            items: reviews.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
