import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email(),
    organization_id: z.string().optional(),
    role_slug: z.string().optional(),
    expires_in_days: z.number().int().min(1).max(30).optional(),
    inviter_user_id: z.string().optional(),
    locale: z.string().optional()
});
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
    description: 'Create a WorkOS user invitation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workos.com/docs/reference/user-management/invitation
            endpoint: '/user_management/invitations',
            data: {
                email: input.email,
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.role_slug !== undefined && { role_slug: input.role_slug }),
                ...(input.expires_in_days !== undefined && { expires_in_days: input.expires_in_days }),
                ...(input.inviter_user_id !== undefined && { inviter_user_id: input.inviter_user_id }),
                ...(input.locale !== undefined && { locale: input.locale })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
