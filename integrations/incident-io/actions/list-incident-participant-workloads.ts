import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: IncidentParticipantWorkloads V2#List
const InputSchema = z.object({ incident_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_participant_workloads: z.array(
            z
                .object({
                    archived_at: z.string().optional(),
                    participant_type: z.enum(['observer', 'collaborator', 'responder']).optional(),
                    user: z
                        .object({
                            email: z.string().optional(),
                            id: z.string(),
                            name: z.string(),
                            role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                            slack_user_id: z.string().optional()
                        })
                        .passthrough(),
                    workload: z
                        .object({
                            minutes_spent_on_incident: z.number(),
                            minutes_spent_on_incident_in_late_hours: z.number(),
                            minutes_spent_on_incident_in_sleeping_hours: z.number(),
                            minutes_spent_on_incident_in_working_hours: z.number()
                        })
                        .passthrough()
                })
                .passthrough()
        ),
        metadata: z.object({ data_synced_at: z.string().nullable().optional() }).passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List incident participant workloads in incident.io.',
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
            endpoint: `/v2/incident_participant_workloads`,
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
