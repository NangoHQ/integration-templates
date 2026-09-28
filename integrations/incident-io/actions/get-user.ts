import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Users V2#Show
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        user: z
            .object({
                base_role: z.object({ description: z.string().optional(), id: z.string(), name: z.string(), slug: z.string() }).passthrough(),
                custom_roles: z.array(z.object({ description: z.string().optional(), id: z.string(), name: z.string(), slug: z.string() }).passthrough()),
                email: z.string().optional(),
                id: z.string(),
                is_active: z.boolean(),
                name: z.string(),
                role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                seats: z
                    .object({ on_call: z.enum(['full_access', 'viewer_only', 'none']), response: z.enum(['full_access', 'viewer_only', 'none']) })
                    .passthrough(),
                slack_user_id: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get user in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/users/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
