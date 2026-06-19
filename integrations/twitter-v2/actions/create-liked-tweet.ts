import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the authenticated user that is requesting to like the Post. Must match the authenticated user.'),
    tweetId: z.string().describe('The ID of the Post to like. Example: "1228393702244134912"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        liked: z.boolean()
    })
});

const OutputSchema = z.object({
    liked: z.boolean()
});

const action = createAction({
    description: 'Create a liked tweet in Twitter/X',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['like.write', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.x.com/en/docs/x-api/tweets/likes/api-reference/post-users-id-likes
        const response = await nango.post({
            endpoint: `/2/users/${input.userId}/likes`,
            data: {
                tweet_id: input.tweetId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to like tweet. Empty response from API.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            liked: parsed.data.liked
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
