import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TweetSchema = z.object({
    id: z.string(),
    text: z.string(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    conversation_id: z.string().optional(),
    in_reply_to_user_id: z.string().optional(),
    referenced_tweets: z
        .array(
            z.object({
                type: z.enum(['retweeted', 'quoted', 'replied_to']),
                id: z.string()
            })
        )
        .optional(),
    public_metrics: z
        .object({
            retweet_count: z.number().optional(),
            reply_count: z.number().optional(),
            like_count: z.number().optional(),
            impression_count: z.number().optional(),
            bookmark_count: z.number().optional(),
            quote_count: z.number().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    since_id: z.string(),
    pagination_token: z.string(),
    max_seen_id: z.string()
});

const isTweetIdGreater = (candidate: string, current: string) => {
    return BigInt(candidate) > BigInt(current);
};

const getCheckpointValue = (checkpoint: Record<string, string | number | boolean> | null, key: string) => {
    const value = checkpoint?.[key];

    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }

    return value;
};

type TweetResponse = {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    conversation_id?: string;
    in_reply_to_user_id?: string;
    referenced_tweets?: Array<{ type: 'retweeted' | 'quoted' | 'replied_to'; id: string }>;
    public_metrics?: {
        retweet_count?: number;
        reply_count?: number;
        like_count?: number;
        impression_count?: number;
        bookmark_count?: number;
        quote_count?: number;
    };
};

type UserResponse = {
    data: {
        id: string;
    };
};

const sync = createSync({
    description: 'Sync tweets from Twitter/X user timeline',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/tweets' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Tweet: TweetSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const sinceId = getCheckpointValue(checkpoint, 'since_id');
        let paginationToken = getCheckpointValue(checkpoint, 'pagination_token');
        let maxSeenId = getCheckpointValue(checkpoint, 'max_seen_id') ?? sinceId;

        // https://docs.x.com/x-api/users/user-lookup-by-me
        const userResponse = await nango.get<UserResponse>({
            endpoint: '/2/users/me',
            retries: 3
        });

        const userId = userResponse.data.data.id;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.x.com/x-api/posts/user-posts-timeline-by-user-id
            endpoint: `/2/users/${userId}/tweets`,
            params: {
                max_results: 100,
                'tweet.fields': 'created_at,author_id,conversation_id,in_reply_to_user_id,referenced_tweets,public_metrics',
                ...(sinceId ? { since_id: sinceId } : {}),
                ...(paginationToken ? { pagination_token: paginationToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination_token',
                cursor_path_in_response: 'meta.next_token',
                response_path: 'data',
                limit_name_in_request: 'max_results',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    paginationToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const tweets of nango.paginate<TweetResponse>(proxyConfig)) {
            if (tweets.length === 0) {
                continue;
            }

            const formattedTweets = tweets.map((tweet) => ({
                id: tweet.id,
                text: tweet.text,
                ...(tweet.author_id && { author_id: tweet.author_id }),
                ...(tweet.created_at && { created_at: tweet.created_at }),
                ...(tweet.conversation_id && { conversation_id: tweet.conversation_id }),
                ...(tweet.in_reply_to_user_id && { in_reply_to_user_id: tweet.in_reply_to_user_id }),
                ...(tweet.referenced_tweets && { referenced_tweets: tweet.referenced_tweets }),
                ...(tweet.public_metrics && { public_metrics: tweet.public_metrics })
            }));

            await nango.batchSave(formattedTweets, 'Tweet');

            // X tweet IDs are numeric strings, so compare them numerically.
            for (const tweet of tweets) {
                if (maxSeenId === undefined || isTweetIdGreater(tweet.id, maxSeenId)) {
                    maxSeenId = tweet.id;
                }
            }

            // Keep the original since_id while paging older results so a resumed
            // run continues the same incremental window before advancing the high-water mark.
            if (paginationToken) {
                await nango.saveCheckpoint({
                    since_id: sinceId ?? '',
                    pagination_token: paginationToken,
                    max_seen_id: maxSeenId ?? ''
                });
                continue;
            }

            if (maxSeenId !== undefined) {
                await nango.saveCheckpoint({
                    since_id: maxSeenId,
                    pagination_token: '',
                    max_seen_id: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
