import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ session_id: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        client_id: z.string().optional(),
        user_id: z.string(),
        status: z.enum(['abandoned', 'active', 'ended', 'expired', 'removed', 'replaced', 'revoked']).optional(),
        last_active_at: z.number().optional(),
        expire_at: z.number().optional(),
        abandon_at: z.number().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a Clerk session.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/GetSession
            endpoint: `/v1/sessions/${encodeURIComponent(input.session_id)}`,
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
