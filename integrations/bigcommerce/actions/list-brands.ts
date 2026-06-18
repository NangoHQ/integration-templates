import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    limit: z.number().optional().describe('Number of items per page. Default: 50.')
});

const ProviderBrandSchema = z.object({
    id: z.number(),
    name: z.string(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    image_url: z.string().optional(),
    search_keywords: z.string().optional(),
    custom_url: z
        .object({
            url: z.string(),
            is_customized: z.boolean()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderBrandSchema),
    meta: z
        .object({
            pagination: z
                .object({
                    current_page: z.number(),
                    total_pages: z.number(),
                    links: z
                        .object({
                            next: z.string().optional().nullable()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderBrandSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List brands',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],
    endpoint: {
        path: '/actions/list-brands',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const limit = input.limit ?? 50;

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/brands
            endpoint: '/v3/catalog/brands',
            params: {
                page,
                limit
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextCursor = parsed.meta?.pagination?.links?.next ? String(page + 1) : undefined;

        return {
            items: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
