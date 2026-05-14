import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MentionSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    edit_history_tweet_ids: z.array(z.string()).optional(),
    conversation_id: z.string().optional(),
    in_reply_to_user_id: z.string().optional(),
    public_metrics: z
        .object({
            retweet_count: z.number().optional(),
            reply_count: z.number().optional(),
            like_count: z.number().optional(),
            quote_count: z.number().optional(),
            bookmark_count: z.number().optional(),
            impression_count: z.number().optional()
        })
        .optional(),
    lang: z.string().optional(),
    source: z.string().optional()
});

const CheckpointSchema = z.object({
    since_id: z.string()
});

interface Mention {
    id: string;
    text?: string;
    author_id?: string;
    created_at?: string;
    edit_history_tweet_ids?: string[];
    conversation_id?: string;
    in_reply_to_user_id?: string;
    public_metrics?: {
        retweet_count?: number;
        reply_count?: number;
        like_count?: number;
        quote_count?: number;
        bookmark_count?: number;
        impression_count?: number;
    };
    lang?: string;
    source?: string;
}

const sync = createSync({
    description: 'Sync mentions from Twitter/X',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Mention: MentionSchema
    },
    scopes: ['tweet.read', 'users.read'],

    endpoints: [{ method: 'POST', path: '/syncs/mentions' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const sinceId = checkpoint?.since_id || '';
        let maxId = '';

        const userResponse = await nango.get({
            // https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
            endpoint: '/2/users/me',
            retries: 3
        });

        if (!userResponse.data?.data?.id) {
            throw new Error('Failed to get authenticated user ID from /2/users/me');
        }
        const userId = userResponse.data.data.id;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-mentions
            endpoint: `/2/users/${userId}/mentions`,
            params: {
                'tweet.fields': 'created_at,author_id,conversation_id,in_reply_to_user_id,public_metrics,lang,source,edit_history_tweet_ids',
                max_results: 100,
                ...(sinceId && { since_id: sinceId })
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

        for await (const mentions of nango.paginate<Mention>(proxyConfig)) {
            if (mentions.length === 0) {
                continue;
            }

            const mappedMentions = mentions.map((mention) => ({
                id: mention.id,
                ...(mention.text && { text: mention.text }),
                ...(mention.author_id && { author_id: mention.author_id }),
                ...(mention.created_at && { created_at: mention.created_at }),
                ...(mention.edit_history_tweet_ids && { edit_history_tweet_ids: mention.edit_history_tweet_ids }),
                ...(mention.conversation_id && { conversation_id: mention.conversation_id }),
                ...(mention.in_reply_to_user_id && { in_reply_to_user_id: mention.in_reply_to_user_id }),
                ...(mention.public_metrics && { public_metrics: mention.public_metrics }),
                ...(mention.lang && { lang: mention.lang }),
                ...(mention.source && { source: mention.source })
            }));

            await nango.batchSave(mappedMentions, 'Mention');

            // Track the highest (newest) ID for checkpoint
            // BigInt comparison required — string comparison gives wrong order for IDs of different lengths
            for (const mention of mentions) {
                if (!maxId || BigInt(mention.id) > BigInt(maxId)) {
                    maxId = mention.id;
                }
            }
        }

        if (maxId) {
            await nango.saveCheckpoint({ since_id: maxId });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
