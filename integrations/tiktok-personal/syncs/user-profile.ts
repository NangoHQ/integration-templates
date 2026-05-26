import { createSync } from 'nango';
import { z } from 'zod';

const UserProfileSchema = z.object({
    id: z.string(),
    open_id: z.string(),
    union_id: z.string().optional(),
    avatar_url: z.string().optional(),
    display_name: z.string().optional(),
    bio_description: z.string().optional(),
    profile_deep_link: z.string().optional(),
    is_verified: z.boolean().optional(),
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    likes_count: z.number().optional(),
    video_count: z.number().optional()
});

const TikTokUserInfoResponseSchema = z.object({
    data: z
        .object({
            user: z
                .object({
                    open_id: z.string(),
                    union_id: z.string().optional(),
                    avatar_url: z.string().optional(),
                    display_name: z.string().optional(),
                    bio_description: z.string().optional(),
                    profile_deep_link: z.string().optional(),
                    is_verified: z.boolean().optional(),
                    follower_count: z.number().optional(),
                    following_count: z.number().optional(),
                    likes_count: z.number().optional(),
                    video_count: z.number().optional()
                })
                .optional()
        })
        .optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string().optional(),
            log_id: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync TikTok user profile and stats including follower count, likes count, bio, and verification status',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/user-profile'
        }
    ],
    models: {
        UserProfile: UserProfileSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v2/user/info/ with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. The dataset is a single
        // fixed user record per connection.
        await nango.trackDeletesStart('UserProfile');

        // https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
        const fields = [
            'open_id',
            'union_id',
            'avatar_url',
            'display_name',
            'bio_description',
            'profile_deep_link',
            'is_verified',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count'
        ];
        const response = await nango.get({
            endpoint: '/v2/user/info/',
            params: {
                fields: fields.join(',')
            },
            retries: 3
        });

        const parsed = TikTokUserInfoResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse TikTok user info response: ${parsed.error.message}`);
        }

        const errorCode = parsed.data.error?.code;
        if (errorCode !== 'ok') {
            throw new Error(`TikTok API error: ${errorCode} - ${parsed.data.error?.message ?? ''}`);
        }

        const user = parsed.data.data?.user;
        if (!user) {
            throw new Error('TikTok user info response missing user data');
        }

        const record = {
            id: user.open_id,
            open_id: user.open_id,
            ...(user.union_id !== undefined && { union_id: user.union_id }),
            ...(user.avatar_url !== undefined && { avatar_url: user.avatar_url }),
            ...(user.display_name !== undefined && { display_name: user.display_name }),
            ...(user.bio_description !== undefined && { bio_description: user.bio_description }),
            ...(user.profile_deep_link !== undefined && { profile_deep_link: user.profile_deep_link }),
            ...(user.is_verified !== undefined && { is_verified: user.is_verified }),
            ...(user.follower_count !== undefined && { follower_count: user.follower_count }),
            ...(user.following_count !== undefined && { following_count: user.following_count }),
            ...(user.likes_count !== undefined && { likes_count: user.likes_count }),
            ...(user.video_count !== undefined && { video_count: user.video_count })
        };

        await nango.batchSave([record], 'UserProfile');
        await nango.trackDeletesEnd('UserProfile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
