import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(500).optional().describe('Number of items to return. Maximum 500. Default 100.'),
    sort_by: z.enum(['id', 'update_time', 'add_time']).optional().describe('Field to sort by. Default: id'),
    sort_direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Default: asc')
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().nullable().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

const PipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(PipelineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List pipelines from Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Pipelines#getPipelines
        const response = await nango.get({
            endpoint: '/v1/pipelines',
            params: {
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.limit && { limit: String(input.limit) }),
                ...(input.sort_by && { sort_by: input.sort_by }),
                ...(input.sort_direction && { sort_direction: input.sort_direction })
            },
            retries: 3
        });

        const data = response.data;
        if (!data || !Array.isArray(data.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Pipedrive API'
            });
        }

        const pipelines = data.data.map((item: unknown) => {
            const providerPipeline = ProviderPipelineSchema.parse(item);
            return {
                id: providerPipeline.id,
                name: providerPipeline.name,
                ...(providerPipeline.url && { url: providerPipeline.url }),
                ...(providerPipeline.add_time && { add_time: providerPipeline.add_time }),
                ...(providerPipeline.update_time && { update_time: providerPipeline.update_time }),
                ...(providerPipeline.is_deal_probability_enabled !== undefined && {
                    is_deal_probability_enabled: providerPipeline.is_deal_probability_enabled
                })
            };
        });

        return {
            items: pipelines,
            ...(data.additional_data?.next_cursor && {
                next_cursor: data.additional_data.next_cursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
