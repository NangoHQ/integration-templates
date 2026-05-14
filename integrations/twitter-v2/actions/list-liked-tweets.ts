import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the User to lookup liked tweets for. Example: "2244994945"'),
    cursor: z.string().optional().describe('Pagination cursor token for the next page of results. Omit for the first page.'),
    maxResults: z.number().min(5).max(100).optional().describe('The maximum number of results per page (5-100). Default: 100.')
});

const TweetSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    conversation_id: z.string().optional(),
    public_metrics: z
        .object({
            like_count: z.number().optional(),
            reply_count: z.number().optional(),
            retweet_count: z.number().optional(),
            quote_count: z.number().optional(),
            impression_count: z.number().optional()
        })
        .optional(),
    lang: z.string().optional(),
    source: z.string().optional()
});

const OutputSchema = z.object({
    tweets: z.array(TweetSchema).describe('Array of liked tweets'),
    nextCursor: z.string().optional().describe('Token for the next page of results. Null if there are no more pages.'),
    previousCursor: z.string().optional().describe('Token for the previous page of results.'),
    resultCount: z.number().describe('Number of results returned in this response.')
});

const action = createAction({
    description: 'List liked tweets from a specific Twitter/X user',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-liked-tweets',
        group: 'Likes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['like.read', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            'tweet.fields': 'id,text,author_id,created_at,conversation_id,public_metrics,lang,source',
            max_results: input.maxResults ?? 100
        };

        if (input.cursor) {
            params['pagination_token'] = input.cursor;
        }

        // https://docs.x.com/x-api/posts/get-liked-posts
        const response = await nango.get({
            endpoint: `/2/users/${input.userId}/liked_tweets`,
            params,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        if (response.status === 401) {
            throw new nango.ActionError({
                type: 'unauthorized',
                message: "Not authorized to access this user's likes"
            });
        }

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'API rate limit exceeded',
                retry_after: response.headers['retry-after']
            });
        }

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Twitter API'
            });
        }

        const ApiResponseSchema = z.object({
            data: z.array(z.unknown()).optional(),
            meta: z
                .object({
                    result_count: z.number().optional(),
                    next_token: z.string().optional(),
                    previous_token: z.string().optional()
                })
                .optional()
        });

        const parsedResponse = ApiResponseSchema.parse(rawData);
        const tweets = parsedResponse.data?.map((tweet: unknown) => TweetSchema.parse(tweet)) ?? [];
        const resultCount = parsedResponse.meta?.result_count ?? tweets.length;
        const nextToken = parsedResponse.meta?.next_token;
        const previousToken = parsedResponse.meta?.previous_token;

        return {
            tweets,
            resultCount,
            ...(nextToken !== undefined && { nextCursor: nextToken }),
            ...(previousToken !== undefined && { previousCursor: previousToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
