import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userInvitationUuid: z.string().describe('The UUID of the user invitation. Example: "00000000-0000-0000-0000-000000000000"')
});

const ProviderUserInvitationSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            uuid: z.string(),
            login_method: z.string().nullable(),
            invite_type: z.string(),
            created_at: z.string(),
            expires_at: z.string()
        }),
        relationships: z
            .object({
                user: z.object({
                    data: z.object({
                        type: z.string(),
                        id: z.string()
                    })
                })
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    uuid: z.string(),
    loginMethod: z.string().nullable().optional(),
    inviteType: z.string(),
    createdAt: z.string(),
    expiresAt: z.string(),
    user: z
        .object({
            id: z.string(),
            type: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Get the status/details of a single user invitation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_invite_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/users/#get-user-invitation
            endpoint: `v2/user_invitations/${encodeURIComponent(input.userInvitationUuid)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User invitation not found',
                userInvitationUuid: input.userInvitationUuid
            });
        }

        const providerInvitation = ProviderUserInvitationSchema.parse(response.data);

        const data = providerInvitation.data;
        const attrs = data.attributes;
        const userRelationship = data.relationships?.user?.data;

        return {
            id: data.id,
            type: data.type,
            uuid: attrs.uuid,
            ...(attrs.login_method !== undefined && { loginMethod: attrs.login_method }),
            inviteType: attrs.invite_type,
            createdAt: attrs.created_at,
            expiresAt: attrs.expires_at,
            ...(userRelationship !== undefined && {
                user: {
                    id: userRelationship.id,
                    type: userRelationship.type
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
