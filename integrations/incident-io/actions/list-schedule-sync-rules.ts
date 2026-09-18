import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ListScheduleSyncRules
const InputSchema = z.object({ page_size: z.number().int().min(1).max(250).optional(), after: z.string().optional(), schedule_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        pagination_meta: z
            .object({ after: z.string().optional(), page_size: z.number().int().max(250) })
            .passthrough()
            .optional(),
        schedule_sync_rules: z.array(
            z
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
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List schedule sync rules in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedules/${encodeURIComponent(input['schedule_id'])}/sync_rules`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return { ...data, next_cursor: data.pagination_meta?.after || undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
