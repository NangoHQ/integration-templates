import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(250).optional().describe('Number of items to return per page. Default is 50, maximum is 250.')
});

const WishlistItemSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    variant_id: z.number().optional()
});

const WishlistSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    name: z.string(),
    is_public: z.boolean(),
    token: z.string().optional(),
    items: z.array(WishlistItemSchema).optional()
});

const PaginationSchema = z.object({
    total: z.number(),
    count: z.number(),
    per_page: z.number(),
    current_page: z.number(),
    total_pages: z.number()
});

const ResponseSchema = z.object({
    data: z.array(WishlistSchema),
    meta: z.object({
        pagination: PaginationSchema
    })
});

const OutputSchema = z.object({
    items: z.array(WishlistSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List wishlists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],
    endpoint: {
        path: '/actions/list-wishlists',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedPage = input.cursor ? Number(input.cursor) : 1;
        if (input.cursor && (!Number.isInteger(parsedPage) || parsedPage < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }
        const page = parsedPage;

        // https://developer.bigcommerce.com/docs/rest-management/wishlists
        const response = await nango.get({
            endpoint: '/v3/wishlists',
            params: {
                page: String(page),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from BigCommerce API',
                details: parsed.error.message
            });
        }

        const { data, meta } = parsed.data;
        const next_cursor = meta.pagination.current_page < meta.pagination.total_pages ? String(meta.pagination.current_page + 1) : undefined;

        return {
            items: data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
