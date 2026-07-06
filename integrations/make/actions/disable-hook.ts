import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('The ID of the webhook to disable. Example: 3329422')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Disable a hook so it stops accepting incoming data.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/
        const response = await nango.post({
            endpoint: `/hooks/${encodeURIComponent(String(input.hookId))}/disable`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The Make API returned an unexpected response when disabling the hook.',
                details: parsed.error.issues
            });
        }

        return {
            success: parsed.data.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
