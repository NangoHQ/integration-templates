import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderDealLossReasonSchema = z.object({
    id: z.number(),
    name: z.string(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number().optional(),
    per_page: z.number().optional(),
    total: z.number().optional(),
    url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(ProviderDealLossReasonSchema),
    pagination: ProviderPaginationSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            position: z.number().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List reasons that can be assigned when marking a deal lost.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/deal_loss_reasons.json',
            params: {
                ...(input.cursor && { page: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const pagination = providerResponse.pagination;

        let next_cursor: string | undefined;
        if (pagination) {
            const hasMore =
                pagination.page != null && pagination.per_page != null && pagination.total != null && pagination.page * pagination.per_page < pagination.total;
            if (hasMore) {
                next_cursor = String(pagination.page + 1);
            }
        }

        return {
            items: providerResponse.entries.map((reason) => ({
                id: reason.id,
                name: reason.name,
                ...(reason.position !== undefined && { position: reason.position }),
                ...(reason.created_at !== undefined && { created_at: reason.created_at }),
                ...(reason.updated_at !== undefined && { updated_at: reason.updated_at })
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
