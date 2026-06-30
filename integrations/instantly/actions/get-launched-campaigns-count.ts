import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    count: z.number()
});

const OutputSchema = z.object({
    count: z.number()
});

const action = createAction({
    description: 'Get launched campaign count.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-launched-campaigns-count',
        method: 'GET'
    },

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: '/v2/campaigns/count-launched',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            count: providerResponse.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
