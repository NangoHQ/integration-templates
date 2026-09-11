import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ connection_id: z.string() });
const ResourceSchema = z
    .object({
        object: z.literal('connection'),
        id: z.string(),
        organization_id: z.string().optional(),
        connection_type: z.string(),
        name: z.string(),
        state: z.enum(['requires_type', 'draft', 'active', 'validating', 'inactive', 'deleting']),
        status: z.enum(['linked', 'unlinked']),
        domains: z.array(z.object({ id: z.string(), object: z.literal('connection_domain'), domain: z.string() }).passthrough()),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a WorkOS SSO connection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/sso/connection
            endpoint: `/connections/${encodeURIComponent(input.connection_id)}`,

            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
