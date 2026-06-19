import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the pipeline to retrieve. Example: 1')
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    is_deal_probability_enabled: z.boolean().optional(),
    add_time: z.string().optional(),
    update_time: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    is_deal_probability_enabled: z.boolean().optional(),
    add_time: z.string().optional(),
    update_time: z.string().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single pipeline from Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Pipelines#getPipeline
            endpoint: `/v1/pipelines/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Pipeline with ID ${input.id} not found`,
                pipeline_id: input.id
            });
        }

        const pipeline = ProviderPipelineSchema.parse(response.data.data);

        return {
            id: pipeline.id,
            name: pipeline.name,
            is_deal_probability_enabled: pipeline.is_deal_probability_enabled,
            add_time: pipeline.add_time,
            update_time: pipeline.update_time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
