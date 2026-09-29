import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ShowScheduleReplica
const InputSchema = z.object({ schedule_id: z.string(), id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        schedule_replica: z
            .object({
                created_at: z.string(),
                id: z.string(),
                last_sync_error: z.string().nullable().optional(),
                last_synced_at: z.string().nullable().optional(),
                mirror_window_days: z.number().int().min(1).max(90).optional(),
                replica_fallback_user_id: z.string(),
                replica_provider: z.enum(['native', 'pagerduty', 'opsgenie', 'jsm']),
                replica_provider_id: z.string(),
                schedule_id: z.string(),
                sources: z.array(z.object({ layer_id: z.string(), rotation_id: z.string() }).passthrough()),
                updated_at: z.string(),
                user_statuses: z.array(z.object({ external_user_id: z.string().nullable().optional(), user_id: z.string() }).passthrough())
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get schedule replica in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedules/${encodeURIComponent(input['schedule_id'])}/replicas/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
