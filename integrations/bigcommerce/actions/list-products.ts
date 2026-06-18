import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of items per page. Defaults to 50.')
});

const ProviderProductSchema = z
    .object({
        id: z.number(),
        name: z.string()
    })
    .passthrough();

const PaginationLinksSchema = z.object({
    next: z.string().optional(),
    current: z.string().optional()
});

const PaginationSchema = z.object({
    total: z.number().optional(),
    count: z.number().optional(),
    per_page: z.number().optional(),
    current_page: z.number().optional(),
    total_pages: z.number().optional(),
    links: PaginationLinksSchema.optional()
});

const MetaSchema = z.object({
    pagination: PaginationSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderProductSchema),
    meta: MetaSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderProductSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List catalog products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],
    endpoint: {
        path: '/actions/list-products',
        method: 'GET'
    },
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/catalog/products#get-all-products
            endpoint: '/v3/catalog/products',
            params: {
                limit: input.limit ?? 50,
                ...(input.cursor && { page: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextLink = providerResponse.meta?.pagination?.links?.next;
        let next_cursor: string | undefined;
        if (nextLink) {
            const url = new URL(nextLink, 'http://localhost');
            const nextPage = url.searchParams.get('page');
            if (nextPage) {
                next_cursor = nextPage;
            }
        }

        return {
            items: providerResponse.data,
            ...(next_cursor && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
