import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Types V1#List
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_types: z.array(
            z
                .object({
                    create_in_triage: z.enum(['always', 'optional']),
                    created_at: z.string(),
                    description: z.string(),
                    id: z.string(),
                    is_default: z.boolean(),
                    name: z.string(),
                    owning_team_ids: z.array(z.string()).optional(),
                    private_incidents_only: z.boolean(),
                    updated_at: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List incident types in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v1/incident_types`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
