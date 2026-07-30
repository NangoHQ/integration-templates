import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.string();

const OutputSchema = z.object({
    key: z.string()
});

const action = createAction({
    description: 'Get the public key used to verify incoming webhook payload signatures.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/
        const response = await nango.get({
            endpoint: 'public/api/v1/webhooks/verification-key',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            key: providerData
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
