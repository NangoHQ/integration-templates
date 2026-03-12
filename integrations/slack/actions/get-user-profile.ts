import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID to get profile information for. Example: "U0123456789"')
});

const ProfileSchema = z
    .object({
        avatar_hash: z.union([z.string(), z.null()]),
        status_text: z.union([z.string(), z.null()]),
        status_emoji: z.union([z.string(), z.null()]),
        status_expiration: z.union([z.number(), z.null()]),
        real_name: z.union([z.string(), z.null()]),
        display_name: z.union([z.string(), z.null()]),
        real_name_normalized: z.union([z.string(), z.null()]),
        display_name_normalized: z.union([z.string(), z.null()]),
        email: z.union([z.string(), z.null()]),
        title: z.union([z.string(), z.null()]),
        phone: z.union([z.string(), z.null()]),
        skype: z.union([z.string(), z.null()]),
        first_name: z.union([z.string(), z.null()]),
        last_name: z.union([z.string(), z.null()]),
        image_original: z.union([z.string(), z.null()]),
        image_24: z.union([z.string(), z.null()]),
        image_32: z.union([z.string(), z.null()]),
        image_48: z.union([z.string(), z.null()]),
        image_72: z.union([z.string(), z.null()]),
        image_192: z.union([z.string(), z.null()]),
        image_512: z.union([z.string(), z.null()]),
        team: z.union([z.string(), z.null()]),
        fields: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    team_id: z.union([z.string(), z.null()]),
    name: z.union([z.string(), z.null()]),
    real_name: z.union([z.string(), z.null()]),
    display_name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    profile: ProfileSchema,
    deleted: z.boolean(),
    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_primary_owner: z.boolean(),
    is_restricted: z.boolean(),
    is_ultra_restricted: z.boolean(),
    is_bot: z.boolean(),
    is_app_user: z.boolean(),
    has_2fa: z.boolean(),
    tz: z.union([z.string(), z.null()]),
    tz_label: z.union([z.string(), z.null()]),
    tz_offset: z.union([z.number(), z.null()]),
    updated: z.union([z.number(), z.null()])
});

const action = createAction({
    description: "Retrieve a user's detailed profile, status, and custom fields",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-user-profile',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read', 'users:read.email'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/users.info
        const response = await nango.get({
            endpoint: 'users.info',
            params: {
                user: input.user_id
            },
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to fetch user profile'
            });
        }

        const user = response.data.user;

        if (!user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User not found: ${input.user_id}`,
                user_id: input.user_id
            });
        }

        return {
            id: user.id,
            team_id: user.team_id ?? null,
            name: user.name ?? null,
            real_name: user.real_name ?? null,
            display_name: user.profile?.display_name ?? null,
            email: user.profile?.email ?? null,
            profile: {
                avatar_hash: user.profile?.avatar_hash ?? null,
                status_text: user.profile?.status_text ?? null,
                status_emoji: user.profile?.status_emoji ?? null,
                status_expiration: user.profile?.status_expiration ?? null,
                real_name: user.profile?.real_name ?? null,
                display_name: user.profile?.display_name ?? null,
                real_name_normalized: user.profile?.real_name_normalized ?? null,
                display_name_normalized: user.profile?.display_name_normalized ?? null,
                email: user.profile?.email ?? null,
                title: user.profile?.title ?? null,
                phone: user.profile?.phone ?? null,
                skype: user.profile?.skype ?? null,
                first_name: user.profile?.first_name ?? null,
                last_name: user.profile?.last_name ?? null,
                image_original: user.profile?.image_original ?? null,
                image_24: user.profile?.image_24 ?? null,
                image_32: user.profile?.image_32 ?? null,
                image_48: user.profile?.image_48 ?? null,
                image_72: user.profile?.image_72 ?? null,
                image_192: user.profile?.image_192 ?? null,
                image_512: user.profile?.image_512 ?? null,
                team: user.profile?.team ?? null,
                fields: user.profile?.fields ?? null
            },
            deleted: user.deleted ?? false,
            is_admin: user.is_admin ?? false,
            is_owner: user.is_owner ?? false,
            is_primary_owner: user.is_primary_owner ?? false,
            is_restricted: user.is_restricted ?? false,
            is_ultra_restricted: user.is_ultra_restricted ?? false,
            is_bot: user.is_bot ?? false,
            is_app_user: user.is_app_user ?? false,
            has_2fa: user.has_2fa ?? false,
            tz: user.tz ?? null,
            tz_label: user.tz_label ?? null,
            tz_offset: user.tz_offset ?? null,
            updated: user.updated ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
