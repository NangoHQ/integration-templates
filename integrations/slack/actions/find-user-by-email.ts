import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('Email address of the user to look up. Example: "user@example.com"')
});

const OutputSchema = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    real_name: z.union([z.string(), z.null()]),
    email: z.string(),
    is_admin: z.boolean(),
    is_bot: z.boolean(),
    is_restricted: z.boolean(),
    is_ultra_restricted: z.boolean(),
    is_deleted: z.boolean(),
    profile: z.object({
        avatar_hash: z.union([z.string(), z.null()]),
        status_text: z.union([z.string(), z.null()]),
        status_emoji: z.union([z.string(), z.null()]),
        real_name: z.union([z.string(), z.null()]),
        display_name: z.union([z.string(), z.null()]),
        email: z.union([z.string(), z.null()]),
        image_24: z.union([z.string(), z.null()]),
        image_32: z.union([z.string(), z.null()]),
        image_48: z.union([z.string(), z.null()]),
        image_72: z.union([z.string(), z.null()]),
        image_192: z.union([z.string(), z.null()]),
        image_512: z.union([z.string(), z.null()])
    })
});

const action = createAction({
    description: 'Look up a user by email address',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/find-user-by-email',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read.email'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.dev/reference/methods/users.lookupByEmail
        const response = await nango.get({
            endpoint: 'users.lookupByEmail',
            params: {
                email: input.email
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            const errorMsg = response.data?.error || 'User not found';
            throw new nango.ActionError({
                type: 'not_found',
                message: errorMsg,
                email: input.email
            });
        }

        const user = response.data.user;

        return {
            id: user.id,
            team_id: user.team_id,
            name: user.name,
            real_name: user.real_name ?? null,
            email: user.profile?.email || input.email,
            is_admin: user.is_admin || false,
            is_bot: user.is_bot || false,
            is_restricted: user.is_restricted || false,
            is_ultra_restricted: user.is_ultra_restricted || false,
            is_deleted: user.deleted || false,
            profile: {
                avatar_hash: user.profile?.avatar_hash ?? null,
                status_text: user.profile?.status_text ?? null,
                status_emoji: user.profile?.status_emoji ?? null,
                real_name: user.profile?.real_name ?? null,
                display_name: user.profile?.display_name ?? null,
                email: user.profile?.email ?? null,
                image_24: user.profile?.image_24 ?? null,
                image_32: user.profile?.image_32 ?? null,
                image_48: user.profile?.image_48 ?? null,
                image_72: user.profile?.image_72 ?? null,
                image_192: user.profile?.image_192 ?? null,
                image_512: user.profile?.image_512 ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
