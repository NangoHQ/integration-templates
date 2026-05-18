import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the pipeline to delete. Example: 123')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().optional()
});

const action = createAction({
    description: 'Delete or archive a pipeline in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Pipelines#deletePipeline
        const response = await nango.delete({
            endpoint: `/v1/pipelines/${input.id}`,
            retries: 3
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        return {
            success: parsed.success,
            ...(parsed.data?.id !== undefined && { id: parsed.data.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
