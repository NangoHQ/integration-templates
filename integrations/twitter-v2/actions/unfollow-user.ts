import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    target_user_id: z.string().describe('The user ID of the user to unfollow. Example: "123456789"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        following: z.boolean()
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    following: z.boolean().optional()
});

const action = createAction({
    description: 'Unfollow a user from the authenticated account',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.read', 'follows.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ user_id?: string }>();
        let sourceUserId = metadata?.user_id;

        if (!sourceUserId) {
            // https://docs.x.com/x-api/users/api-reference/get-users-me
            const meResponse = await nango.get({
                endpoint: '/2/users/me',
                retries: 3
            });

            const meSchema = z.object({
                data: z.object({
                    id: z.string()
                })
            });

            const parsed = meSchema.safeParse(meResponse.data);

            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Could not retrieve authenticated user ID'
                });
            }

            sourceUserId = parsed.data.data.id;
        }

        const response = await nango.delete({
            // https://docs.x.com/x-api/users/follows/api-reference/delete-users-source-user-id-following-target-user-id
            endpoint: `/2/users/${sourceUserId}/following/${input.target_user_id}`,
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found or you are not following this user',
                target_user_id: input.target_user_id
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'forbidden',
                message: 'You cannot unfollow this user'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from X API',
                details: parsed.error.message
            });
        }

        return {
            success: !parsed.data.data.following,
            following: parsed.data.data.following
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
