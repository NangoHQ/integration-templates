import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    capabilities: z.array(z.string())
});

const OutputSchema = z.object({
    capabilities: z.array(z.string())
});

const action = createAction({
    description: 'Retrieve current Canva user capabilities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:read'],
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user-capabilities'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/
            endpoint: '/rest/v1/users/me/capabilities',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            capabilities: providerData.capabilities
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
