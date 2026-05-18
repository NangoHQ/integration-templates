import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the pipeline. Example: "Sales Pipeline"'),
    deal_probability: z.boolean().optional().describe('Whether deal probability is enabled for this pipeline')
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    deal_probability: z.union([z.boolean(), z.number()]).nullable().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active: z.boolean().optional(),
    order_nr: z.number().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderPipelineSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    deal_probability: z.union([z.boolean(), z.number()]).optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    active: z.boolean().optional(),
    order_nr: z.number().optional()
});

const action = createAction({
    description: 'Create a pipeline in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pipedrive.com/docs/api/v1/Pipelines#addPipeline
            endpoint: '/v1/pipelines',
            data: {
                name: input.name,
                ...(input.deal_probability !== undefined && { deal_probability: input.deal_probability ? 1 : 0 })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const data = providerResponse.data;

        return {
            id: String(data.id),
            name: data.name,
            ...(data.deal_probability != null && { deal_probability: data.deal_probability }),
            ...(data.add_time != null && { add_time: data.add_time }),
            ...(data.update_time != null && { update_time: data.update_time }),
            ...(data.active !== undefined && { active: data.active }),
            ...(data.order_nr !== undefined && { order_nr: data.order_nr })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
