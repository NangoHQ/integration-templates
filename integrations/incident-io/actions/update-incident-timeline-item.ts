import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Incident Timeline Items V2#Update
const InputSchema = z
    .object({
        id: z.string(),
        body: z.object({ description: z.string().optional(), timestamp: z.string().optional(), title: z.string().min(1).optional() }).passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        incident_timeline_item: z
            .object({
                activity_log_id: z.string().optional(),
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
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Update incident timeline item in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/incident_timeline_items/${encodeURIComponent(input['id'])}`,
            retries: 3,
            data: input.body
        };
        const response = await nango.patch(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
