import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the pipeline to update. Example: 6'),
    name: z.string().optional().describe('The name of the pipeline'),
    is_deal_probability_enabled: z.boolean().optional().describe('Whether deal probability is disabled or enabled for this pipeline')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        id: z.number(),
        name: z.string(),
        is_deal_probability_enabled: z.boolean().optional(),
        add_time: z.string().optional(),
        update_time: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    is_deal_probability_enabled: z.boolean().optional()
});

const action = createAction({
    description: 'Update a pipeline in Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: { name?: string; is_deal_probability_enabled?: boolean } = {};

        if (input.name !== undefined) {
            updateData.name = input.name;
        }

        if (input.is_deal_probability_enabled !== undefined) {
            updateData.is_deal_probability_enabled = input.is_deal_probability_enabled;
        }

        // https://developers.pipedrive.com/docs/api/v1/Pipelines#updatePipeline
        const response = await nango.patch({
            endpoint: `/v2/pipelines/${input.id}`,
            data: updateData,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pipeline not found',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'API returned unsuccessful response',
                id: input.id
            });
        }

        const pipeline = providerResponse.data;

        return {
            id: pipeline.id,
            name: pipeline.name,
            ...(pipeline.is_deal_probability_enabled !== undefined && {
                is_deal_probability_enabled: pipeline.is_deal_probability_enabled
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
