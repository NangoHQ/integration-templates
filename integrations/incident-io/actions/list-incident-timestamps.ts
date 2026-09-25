import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Timestamps V2#List
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({ incident_timestamps: z.array(z.object({ id: z.string(), name: z.string(), rank: z.number().int() }).passthrough()) })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List incident timestamps in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_timestamps`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
