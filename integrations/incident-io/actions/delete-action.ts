import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Actions V3#Delete
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z.object({}).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Delete action in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v3/actions/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.delete(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
