import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    token: z.string()
});

const OutputSchema = z.object({
    token: z.string()
});

const action = createAction({
    description: 'Verify that the configured database token is valid.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.baserow.io/api/redoc/
        const response = await nango.get({
            endpoint: '/database/tokens/check/',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Failed to parse provider response.',
                details: parsed.error.issues
            });
        }

        return {
            token: parsed.data.token
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
