import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PipelineStageSchema = z.object({
    id: z.number(),
    name: z.string(),
    position: z.number().optional(),
    pipeline_id: z.number().optional()
});

const ProviderDealPipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_type: z.string(),
    lost_stage: PipelineStageSchema.optional(),
    won_stage: PipelineStageSchema.optional(),
    has_deals: z.boolean().optional(),
    count_deals: z.number().optional()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(ProviderDealPipelineSchema),
    pagination: z
        .object({
            next_cursor: z.string().optional().nullable()
        })
        .optional()
});

const OutputPipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline_type: z.string(),
    lost_stage: PipelineStageSchema.optional(),
    won_stage: PipelineStageSchema.optional(),
    has_deals: z.boolean().optional(),
    count_deals: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputPipelineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deal pipelines configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/deal_pipelines',
            params: {
                ...(input.cursor !== undefined && input.cursor !== '' && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        const items = parsed.entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            pipeline_type: entry.pipeline_type,
            ...(entry.lost_stage !== undefined && { lost_stage: entry.lost_stage }),
            ...(entry.won_stage !== undefined && { won_stage: entry.won_stage }),
            ...(entry.has_deals !== undefined && { has_deals: entry.has_deals }),
            ...(entry.count_deals !== undefined && { count_deals: entry.count_deals })
        }));

        return {
            items,
            ...(parsed.pagination?.next_cursor != null && parsed.pagination.next_cursor !== '' && { next_cursor: parsed.pagination.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
