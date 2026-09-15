import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Timeline Items V2#List
const InputSchema = z.object({ incident_id: z.string(), page_size: z.number().int().min(1).max(250).optional(), after: z.string().optional() }).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_timeline_items: z.array(
            z
                .object({
                    activity_log_id: z.string().nullable().optional(),
                    created_at: z.string(),
                    creator: z
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
                        .passthrough(),
                    description: z.string().optional(),
                    id: z.string(),
                    incident_id: z.string(),
                    timestamp: z.string(),
                    title: z.string(),
                    updated_at: z.string()
                })
                .passthrough()
        ),
        pagination_meta: z
            .object({ after: z.string().optional(), page_size: z.number().int().max(250) })
            .passthrough()
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List incident timeline items in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['incident_id'] !== undefined)
            params['incident_id'] = Array.isArray(input['incident_id']) ? input['incident_id'].join(',') : String(input['incident_id']);
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_timeline_items`,
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
