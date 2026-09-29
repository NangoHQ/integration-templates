import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: IncidentParticipants V2#List
const InputSchema = z.object({ incident_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_participants: z
            .object({
                active: z.array(
                    z
                        .object({
                            participant_type: z.enum(['observer', 'collaborator', 'responder']),
                            user: z
                                .object({
                                    email: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                    slack_user_id: z.string().optional()
                                })
                                .passthrough()
                        })
                        .passthrough()
                ),
                passive: z.array(
                    z
                        .object({
                            participant_type: z.enum(['observer', 'collaborator', 'responder']),
                            user: z
                                .object({
                                    email: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                    slack_user_id: z.string().optional()
                                })
                                .passthrough()
                        })
                        .passthrough()
                )
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List incident participants in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['incident_id'] !== undefined)
            params['incident_id'] = Array.isArray(input['incident_id']) ? input['incident_id'].join(',') : String(input['incident_id']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_participants`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
