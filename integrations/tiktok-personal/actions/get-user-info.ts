import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_FIELDS = ['open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_large_url', 'display_name'];

const InputSchema = z.object({
    fields: z.array(z.string()).optional().describe('Specific user fields to request. Defaults to basic profile fields.')
});

const ProviderUserSchema = z.object({
    open_id: z.string().optional(),
    union_id: z.string().optional(),
    avatar_url: z.string().optional(),
    avatar_url_100: z.string().optional(),
    avatar_large_url: z.string().optional(),
    display_name: z.string().optional(),
    bio_description: z.string().optional(),
    profile_deep_link: z.string().optional(),
    is_verified: z.boolean().optional(),
    username: z.string().optional(),
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    likes_count: z.number().optional(),
    video_count: z.number().optional()
});

const TikTokErrorSchema = z.object({
    code: z.string(),
    message: z.string().optional(),
    log_id: z.string().optional()
});

const TikTokResponseSchema = z.object({
    data: z
        .object({
            user: ProviderUserSchema.optional()
        })
        .optional(),
    error: TikTokErrorSchema.optional()
});

const OutputSchema = z.object({
    open_id: z.string().optional(),
    union_id: z.string().optional(),
    avatar_url: z.string().optional(),
    avatar_url_100: z.string().optional(),
    avatar_large_url: z.string().optional(),
    display_name: z.string().optional(),
    bio_description: z.string().optional(),
    profile_deep_link: z.string().optional(),
    is_verified: z.boolean().optional(),
    username: z.string().optional(),
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    likes_count: z.number().optional(),
    video_count: z.number().optional()
});

const action = createAction({
    description: 'Fetch TikTok user profile fields allowed by granted scopes.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user-info',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user.info.basic', 'user.info.profile', 'user.info.stats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fields = input.fields && input.fields.length > 0 ? input.fields : DEFAULT_FIELDS;
        const fieldsParam = fields.join(',');

        const response = await nango.get({
            // https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
            endpoint: '/v2/user/info/',
            params: {
                fields: fieldsParam
            },
            retries: 3
        });

        const parsed = TikTokResponseSchema.parse(response.data);

        if (parsed.error && parsed.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.error.message || `TikTok error: ${parsed.error.code}`,
                code: parsed.error.code,
                log_id: parsed.error.log_id
            });
        }

        const user = parsed.data?.user;
        if (!user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User info not found'
            });
        }

        return {
            ...(user.open_id !== undefined && { open_id: user.open_id }),
            ...(user.union_id !== undefined && { union_id: user.union_id }),
            ...(user.avatar_url !== undefined && { avatar_url: user.avatar_url }),
            ...(user.avatar_url_100 !== undefined && { avatar_url_100: user.avatar_url_100 }),
            ...(user.avatar_large_url !== undefined && { avatar_large_url: user.avatar_large_url }),
            ...(user.display_name !== undefined && { display_name: user.display_name }),
            ...(user.bio_description !== undefined && { bio_description: user.bio_description }),
            ...(user.profile_deep_link !== undefined && { profile_deep_link: user.profile_deep_link }),
            ...(user.is_verified !== undefined && { is_verified: user.is_verified }),
            ...(user.username !== undefined && { username: user.username }),
            ...(user.follower_count !== undefined && { follower_count: user.follower_count }),
            ...(user.following_count !== undefined && { following_count: user.following_count }),
            ...(user.likes_count !== undefined && { likes_count: user.likes_count }),
            ...(user.video_count !== undefined && { video_count: user.video_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
