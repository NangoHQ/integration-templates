import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ShowScheduleSyncRule
const InputSchema = z.object({ schedule_id: z.string(), id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        schedule_sync_rule: z
            .object({
                created_at: z.string(),
                id: z.string(),
                permanent_member_user_ids: z.array(z.string()),
                rotation_id: z.string().optional(),
                schedule_id: z.string(),
                schedule_sync_target: z
                    .object({
                        add_bot_to_group: z.boolean(),
                        created_at: z.string(),
                        id: z.string(),
                        linked_schedules: z.array(z.object({ id: z.string(), name: z.string(), team_ids: z.array(z.string()) }).passthrough()),
                        slack_team_id: z.string(),
                        slack_user_group_id: z.string(),
                        updated_at: z.string()
                    })
                    .passthrough(),
                schedule_sync_target_id: z.string(),
                sync_type: z.enum(['on_call', 'all_users', 'next_on_call']),
                updated_at: z.string()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get schedule sync rule in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedules/${encodeURIComponent(input['schedule_id'])}/sync_rules/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
