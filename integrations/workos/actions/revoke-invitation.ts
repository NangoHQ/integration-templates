import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ invitation_id: z.string() });
const ResourceSchema = z
    .object({
        object: z.literal('invitation'),
        id: z.string(),
        email: z.string(),
        state: z.enum(['pending', 'accepted', 'expired', 'revoked']),
        accepted_at: z.string().nullable(),
        revoked_at: z.string().nullable(),
        expires_at: z.string(),
        organization_id: z.string().nullable(),
        inviter_user_id: z.string().nullable(),
        accepted_user_id: z.string().nullable(),
        role_slug: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        token: z.string(),
        accept_invitation_url: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Revoke a WorkOS user invitation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workos.com/docs/reference/user-management/invitation
            endpoint: `/user_management/invitations/${encodeURIComponent(input.invitation_id)}/revoke`,
            data: {},
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
