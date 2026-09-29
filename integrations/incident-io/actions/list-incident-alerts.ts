import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Alerts V2#ListIncidentAlerts
const InputSchema = z
    .object({
        page_size: z.number().int().min(1).max(50).optional(),
        after: z.string().optional(),
        alert_id: z.string().optional(),
        incident_id: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        incident_alerts: z.array(
            z
                .object({
                    alert: z
                        .object({
                            alert_group_ids: z.array(z.string()).optional(),
                            alert_source_id: z.string(),
                            created_at: z.string(),
                            deduplication_key: z.string(),
                            description: z.string().optional(),
                            id: z.string(),
                            resolved_at: z.string().optional(),
                            source_url: z.string().optional(),
                            status: z.enum(['firing', 'resolved']),
                            title: z.string(),
                            updated_at: z.string()
                        })
                        .passthrough(),
                    alert_route_id: z.string().optional(),
                    id: z.string(),
                    incident: z
                        .object({
                            external_id: z.number().int(),
                            id: z.string(),
                            name: z.string(),
                            reference: z.string(),
                            status_category: z.enum(['triage', 'declined', 'merged', 'canceled', 'active', 'post-incident', 'closed', 'paused']),
                            summary: z.string().optional(),
                            visibility: z.enum(['public', 'private'])
                        })
                        .passthrough()
                })
                .passthrough()
        ),
        pagination_meta: z.object({ after: z.string().optional(), page_size: z.number().int().max(250) }).passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List incident alerts in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['alert_id'] !== undefined) params['alert_id'] = Array.isArray(input['alert_id']) ? input['alert_id'].join(',') : String(input['alert_id']);
        if (input['incident_id'] !== undefined)
            params['incident_id'] = Array.isArray(input['incident_id']) ? input['incident_id'].join(',') : String(input['incident_id']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_alerts`,
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
