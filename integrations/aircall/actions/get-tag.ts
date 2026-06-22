import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Tag ID. Example: 2733978')
});

const ProviderTagSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        color: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderTagSchema;

const ProviderResponseSchema = z.object({
    tag: ProviderTagSchema
});

const action = createAction({
    description: 'Retrieve a single tag from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-tag',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#tags
            endpoint: `/v1/tags/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.tag;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
