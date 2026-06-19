import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tweetId: z.string().describe('The ID of the tweet to like. Example: "1346889436626259968"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        liked: z.boolean()
    })
});

const UsersMeResponseSchema = z.object({
    data: z.object({
        id: z.string()
    })
});

const OutputSchema = z.object({
    liked: z.boolean().describe('Whether the tweet was successfully liked')
});

const MetadataSchema = z.object({
    userId: z.string().optional().describe('The ID of the authenticated user who is liking the tweet. If not provided, will be fetched from /2/users/me')
});

const action = createAction({
    description: 'Like a tweet',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['like.write', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ userId?: string }>();
        let userId = metadata?.userId;

        // If userId not in metadata, fetch from /2/users/me
        if (!userId) {
            // https://docs.x.com/x-api/users/get-authenticated-user-data
            const meResponse = await nango.get({
                endpoint: '/2/users/me',
                retries: 3
            });

            if (!meResponse.data) {
                throw new nango.ActionError({
                    type: 'api_error',
                    message: 'Failed to fetch authenticated user: empty response from API'
                });
            }

            const usersMe = UsersMeResponseSchema.parse(meResponse.data);
            userId = usersMe.data.id;
        }

        // https://docs.x.com/x-api/posts/causes-the-user-in-the-path-to-like-the-specified-post
        const response = await nango.post({
            endpoint: `/2/users/${userId}/likes`,
            data: {
                tweet_id: input.tweetId
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to like tweet: empty response from API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            liked: providerResponse.data.liked
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
