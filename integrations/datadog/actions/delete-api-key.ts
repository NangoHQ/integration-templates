import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    apiKeyId: z.string().describe('The ID of the API key to delete. Example: "1234567890abcdef"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an API key',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/api-keys/#delete-an-api-key
        await nango.delete({
            endpoint: `v2/api_keys/${encodeURIComponent(input.apiKeyId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
