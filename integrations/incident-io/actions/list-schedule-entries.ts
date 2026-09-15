import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ListScheduleEntries
const InputSchema = z
    .object({
        schedule_id: z.string(),
        entry_window_start: z.string().optional(),
        entry_window_end: z.string().optional(),
        after: z
            .string()
            .optional()
            .describe(
                'Cursor from next_cursor. The provider continues a window by re-issuing the request with entry_window_start set to this value, so it replaces entry_window_start when present; keep entry_window_end unchanged.'
            )
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        pagination_meta: z.object({ after: z.string(), after_url: z.string() }).passthrough().optional(),
        schedule_entries: z
            .object({
                final: z.array(
                    z
                        .object({
                            end_at: z.string(),
                            entry_id: z.string().optional(),
                            fingerprint: z.string().optional(),
                            layer_id: z.string().optional(),
                            rotation_id: z.string().optional(),
                            start_at: z.string(),
                            user: z
                                .object({
                                    email: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                    slack_user_id: z.string().optional()
                                })
                                .passthrough()
                                .optional()
                        })
                        .passthrough()
                ),
                overrides: z.array(
                    z
                        .object({
                            end_at: z.string(),
                            entry_id: z.string().optional(),
                            fingerprint: z.string().optional(),
                            layer_id: z.string().optional(),
                            rotation_id: z.string().optional(),
                            start_at: z.string(),
                            user: z
                                .object({
                                    email: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                    slack_user_id: z.string().optional()
                                })
                                .passthrough()
                                .optional()
                        })
                        .passthrough()
                ),
                scheduled: z.array(
                    z
                        .object({
                            end_at: z.string(),
                            entry_id: z.string().optional(),
                            fingerprint: z.string().optional(),
                            layer_id: z.string().optional(),
                            rotation_id: z.string().optional(),
                            start_at: z.string(),
                            user: z
                                .object({
                                    email: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                                    slack_user_id: z.string().optional()
                                })
                                .passthrough()
                                .optional()
                        })
                        .passthrough()
                )
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List schedule entries in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['schedule_id'] !== undefined)
            params['schedule_id'] = Array.isArray(input['schedule_id']) ? input['schedule_id'].join(',') : String(input['schedule_id']);
        const entryWindowStart = input['after'] ?? input['entry_window_start'];
        if (entryWindowStart !== undefined)
            params['entry_window_start'] = Array.isArray(entryWindowStart) ? entryWindowStart.join(',') : String(entryWindowStart);
        if (input['entry_window_end'] !== undefined)
            params['entry_window_end'] = Array.isArray(input['entry_window_end']) ? input['entry_window_end'].join(',') : String(input['entry_window_end']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedule_entries`,
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
