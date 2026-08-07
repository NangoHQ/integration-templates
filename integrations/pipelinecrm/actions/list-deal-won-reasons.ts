import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Default is 200, max is 200.')
});

const ProviderDealWonReasonSchema = z.object({
    id: z.number(),
    name: z.string(),
    position: z.number().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(ProviderDealWonReasonSchema),
    pagination: ProviderPaginationSchema
});

const DealWonReasonSchema = z.object({
    id: z.number(),
    name: z.string(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(DealWonReasonSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List reasons that can be assigned when marking a deal won.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/deal_won_reasons',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.entries.map((entry) => ({
                id: entry.id,
                name: entry.name,
                ...(entry.position != null && { position: entry.position }),
                ...(entry.created_at != null && { created_at: entry.created_at }),
                ...(entry.updated_at != null && { updated_at: entry.updated_at })
            })),
            ...(parsed.pagination.page < parsed.pagination.pages && {
                next_page: parsed.pagination.page + 1
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
