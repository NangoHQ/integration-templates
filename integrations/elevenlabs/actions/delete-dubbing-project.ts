import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dubbing_id: z.string().describe('ID of the dubbing project to delete. Example: "qHq83s7gp3QoJRaiLh9H"')
});

const ProviderResponseSchema = z.object({
    status: z.string()
});

const OutputSchema = z.object({
    status: z.string().describe('The status of the deletion.')
});

const action = createAction({
    description: 'Delete a dubbing project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/delete-dubbing-project'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://elevenlabs.io/docs/api-reference/dubbing/delete
            endpoint: `/v1/dubbing/${encodeURIComponent(input.dubbing_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
