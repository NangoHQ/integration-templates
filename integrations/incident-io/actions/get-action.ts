import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Actions V3#Show
const InputSchema = z.object({ id: z.string() });

const ProviderResponseSchema = z
    .object({
        action: z
            .object({
                assignee: z
                    .object({
                        email: z.string().optional(),
                        id: z.string(),
                        name: z.string(),
                        role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                        slack_user_id: z.string().optional()
                    })
                    .passthrough()
                    .optional(),
                completed_at: z.string().optional(),
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
                description: z.string(),
                id: z.string(),
                incident_id: z.string(),
                status: z.enum(['outstanding', 'completed', 'deleted', 'not_doing']),
                updated_at: z.string()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get action in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v3/actions/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
