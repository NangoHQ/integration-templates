import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('Hook ID. Example: 3329421')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Stop payload structure detection for a hook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.make.com/api-documentation/#hooks/post-hooks-hookid-learn-stop
            endpoint: `/hooks/${encodeURIComponent(input.hookId)}/learn-stop`,
            retries: 3
        });

        const providerResponse = z.object({ success: z.boolean() }).parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
