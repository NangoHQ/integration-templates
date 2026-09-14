import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Updates V2#Create
const InputSchema = z
    .object({
        body: z
            .object({
                idempotency_key: z.string(),
                incident_id: z.string(),
                message: z.string().optional(),
                to_incident_status_id: z.string().optional(),
                to_severity_id: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        incident_update: z
            .object({
                created_at: z.string(),
                id: z.string(),
                incident_id: z.string(),
                merged_into_incident_id: z.string().optional(),
                message: z.string().optional(),
                new_incident_status: z
                    .object({
                        category: z.enum(['triage', 'declined', 'merged', 'canceled', 'live', 'learning', 'closed', 'paused']),
                        created_at: z.string(),
                        description: z.string(),
                        id: z.string(),
                        name: z.string(),
                        rank: z.number().int(),
                        updated_at: z.string()
                    })
                    .passthrough(),
                new_severity: z
                    .object({
                        created_at: z.string(),
                        description: z.string(),
                        id: z.string(),
                        name: z.string().max(50),
                        rank: z.number().int(),
                        updated_at: z.string()
                    })
                    .passthrough()
                    .optional(),
                updater: z
                    .object({
                        alert: z.object({ id: z.string(), title: z.string() }).passthrough().optional(),
                        api_key: z.object({ id: z.string(), name: z.string() }).passthrough().optional(),
                        user: z
                            .object({
                                email: z.string().optional(),
                                id: z.string(),
                                name: z.string(),
                                role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                slack_user_id: z.string().optional()
                            })
                            .passthrough()
                            .optional(),
                        workflow: z.object({ id: z.string(), name: z.string() }).passthrough().optional()
                    })
                    .passthrough()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create incident update in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_updates`,
            retries: 3,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
