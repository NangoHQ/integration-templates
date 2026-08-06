import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Default is 200.')
});

const DealStatusSchema = z.object({
    id: z.number(),
    name: z.string(),
    hex_color: z.string().optional(),
    position: z.number().optional(),
    editable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: ProviderPaginationSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(DealStatusSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List deal statuses configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/deal_statuses.json',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const pagination = providerResponse.pagination;

        const items = providerResponse.entries.map((entry) => {
            return DealStatusSchema.parse(entry);
        });

        const nextPage = pagination && pagination.page * pagination.per_page < pagination.total ? pagination.page + 1 : undefined;

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
