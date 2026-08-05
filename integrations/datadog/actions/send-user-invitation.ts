import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .describe('User IDs of pending users to invite. At least one is required. Example: ["b8b30a2e-fdce-46d6-aef0-63ccf6155094"]')
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            type: z.string(),
            attributes: z
                .object({
                    expires_at: z.string().optional(),
                    created_at: z.string().optional(),
                    status: z.string().optional()
                })
                .optional(),
            relationships: z
                .object({
                    user: z
                        .object({
                            data: z
                                .object({
                                    type: z.string(),
                                    id: z.string()
                                })
                                .optional()
                        })
                        .optional()
                })
                .optional()
        })
    )
});

const OutputSchema = z.object({
    invitations: z.array(
        z.object({
            id: z.string(),
            userId: z.string().optional(),
            expiresAt: z.string().optional(),
            status: z.string().optional()
        })
    )
});

const action = createAction({
    description: '(Re-)send an invitation email to one or more pending users.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_invite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/users/#send-user-invitations
            endpoint: 'v2/user_invitations',
            data: {
                data: input.userIds.map((userId) => ({
                    type: 'user_invitations',
                    relationships: {
                        user: {
                            data: {
                                type: 'users',
                                id: userId
                            }
                        }
                    }
                }))
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const invitations = providerResponse.data.map((item) => ({
            id: item.id,
            ...(item.relationships?.user?.data?.id != null && { userId: item.relationships.user.data.id }),
            ...(item.attributes?.expires_at != null && { expiresAt: item.attributes.expires_at }),
            ...(item.attributes?.status != null && { status: item.attributes.status })
        }));

        return { invitations };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
