import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Alerts V2#TransitionIncidentAlert
const InputSchema = z.object({ id: z.string(), body: z.object({ state: z.enum(['related', 'unrelated']) }).passthrough() }).passthrough();

const ProviderResponseSchema = z
    .object({
        incident_alert: z
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
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Transition incident alert in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_alerts/${encodeURIComponent(input['id'])}/actions/transition`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
