import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of items to return per page. Defaults to 50.')
});

const PriceListItemSchema = z.object({
    id: z.number(),
    name: z.string(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    active: z.boolean().optional()
});

const PaginationLinksSchema = z.object({
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional()
});

const PaginationSchema = z.object({
    total: z.number().optional(),
    count: z.number().optional(),
    per_page: z.number().optional(),
    current_page: z.number().optional(),
    total_pages: z.number().optional(),
    links: PaginationLinksSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(PriceListItemSchema),
    meta: z
        .object({
            pagination: PaginationSchema.optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(PriceListItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List price lists.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-price-lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],
    exec: async (nango, input) => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const limit = input.limit ?? 50;

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/pricing/price-lists#get-price-lists
            endpoint: '/v3/pricelists',
            params: {
                page: String(page),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => ({
            id: item.id,
            name: item.name,
            ...(item.date_created !== undefined && { date_created: item.date_created }),
            ...(item.date_modified !== undefined && { date_modified: item.date_modified }),
            ...(item.active !== undefined && { active: item.active })
        }));

        const nextPage = providerResponse.meta?.pagination?.links?.next;
        const nextCursor = nextPage ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
