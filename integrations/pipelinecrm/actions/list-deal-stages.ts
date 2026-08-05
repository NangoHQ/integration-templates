import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderDealStageSchema = z.object({
    id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    name: z.string(),
    percent: z.number(),
    deal_pipeline_id: z.number()
});

const ProviderListSchema = z.object({
    entries: z.array(ProviderDealStageSchema),
    pagination: ProviderPaginationSchema
});

const DealStageSchema = z.object({
    id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    name: z.string(),
    percent: z.number(),
    deal_pipeline_id: z.number()
});

const OutputSchema = z.object({
    items: z.array(DealStageSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deal stages (steps within a pipeline) configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/deal_stages.json',
            params: {
                page: page.toString()
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        const items = providerList.entries.map((entry) => ({
            id: entry.id,
            ...(entry.created_at !== undefined && { created_at: entry.created_at }),
            ...(entry.updated_at !== undefined && { updated_at: entry.updated_at }),
            name: entry.name,
            percent: entry.percent,
            deal_pipeline_id: entry.deal_pipeline_id
        }));

        const hasMore = providerList.pagination.page < providerList.pagination.pages;

        return {
            items,
            ...(hasMore && { next_cursor: (page + 1).toString() })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
