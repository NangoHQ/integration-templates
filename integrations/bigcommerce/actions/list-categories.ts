import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(250).optional().describe('Number of items per page. Default: 50.')
});

const CategorySchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    layout_file: z.string().optional(),
    image_url: z.string().optional(),
    is_visible: z.boolean().optional(),
    search_keywords: z.string().optional(),
    default_product_sort: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const ListOutputSchema = z.object({
    items: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['store_v2_products_read_only'],

    endpoint: {
        path: '/actions/list-categories',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        const limit = input.limit ?? 50;

        // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#get-categories
        const response = await nango.get({
            endpoint: '/v3/catalog/categories',
            params: {
                page,
                limit
            },
            retries: 3
        });

        const responseSchema = z.object({
            data: z.array(z.unknown()),
            meta: z
                .object({
                    pagination: z
                        .object({
                            links: z
                                .object({
                                    next: z.string().optional()
                                })
                                .optional()
                        })
                        .optional()
                })
                .optional()
        });

        const parsed = responseSchema.parse(response.data);
        const items = parsed.data.map((item) => CategorySchema.parse(item));

        let next_cursor: string | undefined;
        const nextLink = parsed.meta?.pagination?.links?.next;
        if (nextLink) {
            const match = nextLink.match(/page=(\d+)/);
            if (match) {
                next_cursor = match[1];
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
