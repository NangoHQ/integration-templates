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

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            token: providerData.token
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
