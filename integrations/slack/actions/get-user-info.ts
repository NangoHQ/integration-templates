import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Slack user ID. Example: "U12345678"')
});

const OutputSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    real_name: z.union([z.string(), z.null()]),
    display_name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    avatar_url: z.union([z.string(), z.null()]),
    is_bot: z.boolean(),
    is_admin: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_primary_owner: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    is_ultra_restricted: z.boolean().optional(),
    is_app_user: z.boolean().optional(),
    updated: z.number().optional()
});

const action = createAction({
    description: "Retrieve a user's account details, including profile and avatar fields",
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-user-info',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/users.info
        const response = await nango.get({
            endpoint: 'users.info',
            params: {
                user: input.user_id
            },
            retries: 3
        });

        if (!response.data || !response.data.user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const user = response.data.user;
        const profile = user.profile || {};

        return {
            id: user.id,
            team_id: user.team_id,
            name: user.name,
            real_name: profile.real_name || null,
            display_name: profile.display_name || null,
            email: profile.email || null,
            avatar_url: profile.image_512 || profile.image_192 || profile.image_72 || profile.image_48 || null,
            is_bot: user.is_bot || false,
            is_admin: user.is_admin,
            is_owner: user.is_owner,
            is_primary_owner: user.is_primary_owner,
            is_restricted: user.is_restricted,
            is_ultra_restricted: user.is_ultra_restricted,
            is_app_user: user.is_app_user,
            updated: user.updated
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
