import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    date_modified_min: z.string().optional().describe('Filter subscribers modified after this ISO8601 timestamp. Example: "2026-01-01T00:00:00Z"'),
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    limit: z.number().optional().describe('Number of results per page. Defaults to 50.')
});

const ProviderSubscriberSchema = z.object({
    id: z.number(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    source: z.string().optional(),
    order_id: z.number().nullable().optional(),
    channel_id: z.number().nullable().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    total: z.number().optional(),
    count: z.number().optional(),
    per_page: z.number().optional(),
    current_page: z.number().optional(),
    total_pages: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderSubscriberSchema).optional(),
    meta: z
        .object({
            pagination: ProviderPaginationSchema.optional()
        })
        .optional()
});

const ListOutputSchema = z.object({
    items: z.array(ProviderSubscriberSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List email newsletter subscribers.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-subscribers'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['store_v2_customers_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/subscribers
            endpoint: '/v3/customers/subscribers',
            params: {
                ...(input.date_modified_min !== undefined && { 'date_modified:min': input.date_modified_min }),
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.data ?? [];
        const currentPage = providerResponse.meta?.pagination?.current_page ?? 1;
        const totalPages = providerResponse.meta?.pagination?.total_pages ?? 1;

        return {
            items,
            ...(currentPage < totalPages && { next_page: currentPage + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
