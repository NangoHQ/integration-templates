import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// X API v2 liked tweets endpoint
// https://docs.x.com/x-api/users/return-liked-posts

const LikedTweetSchema = z.object({
    id: z.string(),
    text: z.string(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    public_metrics: z
        .object({
            like_count: z.number().optional(),
            retweet_count: z.number().optional(),
            reply_count: z.number().optional(),
            quote_count: z.number().optional(),
            impression_count: z.number().optional(),
            bookmark_count: z.number().optional()
        })
        .optional(),
    edit_history_tweet_ids: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    last_id: z.string()
});

const sync = createSync<{ LikedTweet: typeof LikedTweetSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync liked tweets from Twitter/X',
    version: '1.0.0',
    frequency: 'every 30 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/liked-tweets'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        LikedTweet: LikedTweetSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        // Get the authenticated user's ID
        // https://docs.x.com/x-api/users/get-authenticated-user-data
        const meResponse = await nango.get({
            endpoint: '/2/users/me',
            retries: 3
        });

        if (!meResponse.data || !meResponse.data.data || !meResponse.data.data.id) {
            throw new Error('Failed to get authenticated user ID');
        }

        const userId = meResponse.data.data.id;
        let highestId: string | undefined = checkpoint?.last_id;

        // https://docs.x.com/x-api/users/return-liked-posts
        const proxyConfig: ProxyConfiguration = {
            // https://docs.x.com/x-api/users/return-liked-posts
            endpoint: `/2/users/${userId}/liked_tweets`,
            params: {
                'tweet.fields': 'author_id,created_at,public_metrics,edit_history_tweet_ids',
                ...(checkpoint?.last_id && { since_id: checkpoint.last_id })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination_token',
                cursor_path_in_response: 'meta.next_token',
                response_path: 'data',
                limit_name_in_request: 'max_results',
                limit: 100
            },
            retries: 3
        };

        for await (const tweets of nango.paginate(proxyConfig)) {
            if (tweets.length === 0) {
                continue;
            }

            // Update highest ID seen (tweet IDs are snowflake IDs, higher = newer)
            for (const tweet of tweets) {
                if (!highestId || tweet.id > highestId) {
                    highestId = tweet.id;
                }
            }

            await nango.batchSave(tweets, 'LikedTweet');

            if (highestId) {
                await nango.saveCheckpoint({ last_id: highestId });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
