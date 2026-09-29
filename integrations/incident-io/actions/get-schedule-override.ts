import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ShowOverride
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        override: z
            .object({
                created_at: z.string(),
                end_at: z.string(),
                id: z.string(),
                layer_id: z.string(),
                rotation_id: z.string(),
                schedule_id: z.string(),
                start_at: z.string(),
                updated_at: z.string(),
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
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get schedule override in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedule_overrides/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
