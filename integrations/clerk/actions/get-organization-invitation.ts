import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ organization_id: z.string(), invitation_id: z.string() });
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        email_address: z.string(),
        organization_id: z.string().optional(),
        role: z.string().optional(),
        status: z.enum(['pending', 'accepted', 'revoked', 'expired']).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a Clerk organization invitation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Invitations#operation/GetOrganizationInvitation
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/invitations/${encodeURIComponent(input.invitation_id)}`,
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
