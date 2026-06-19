import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            user: z.object({
                follower_count: z.number().optional(),
                following_count: z.number().optional(),
                likes_count: z.number().optional(),
                video_count: z.number().optional()
            })
        })
        .optional(),
    error: z.object({
        code: z.string(),
        message: z.string().optional(),
        log_id: z.string().optional()
    })
});

const OutputSchema = z.object({
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    likes_count: z.number().optional(),
    video_count: z.number().optional()
});

const action = createAction({
    description: 'Fetch TikTok user statistics including follower count, likes count, and video count.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user.info.stats'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
        const response = await nango.get({
            endpoint: '/v2/user/info/',
            params: {
                fields: 'follower_count,following_count,likes_count,video_count'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.error.message || `TikTok API error: ${parsed.error.code}`,
                code: parsed.error.code,
                log_id: parsed.error.log_id
            });
        }

        const user = parsed.data?.user;
        if (!user) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'TikTok user stats response missing user data'
            });
        }

        return {
            ...(user.follower_count !== undefined && { follower_count: user.follower_count }),
            ...(user.following_count !== undefined && { following_count: user.following_count }),
            ...(user.likes_count !== undefined && { likes_count: user.likes_count }),
            ...(user.video_count !== undefined && { video_count: user.video_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
