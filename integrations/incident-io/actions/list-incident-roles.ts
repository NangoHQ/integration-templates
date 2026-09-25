import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Roles V2#List
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_roles: z.array(
            z
                .object({
                    created_at: z.string(),
                    description: z.string().min(1),
                    id: z.string(),
                    instructions: z.string(),
                    name: z.string().min(1),
                    role_type: z.enum(['lead', 'reporter', 'custom']),
                    shortform: z.string(),
                    updated_at: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List incident roles in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_roles`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
