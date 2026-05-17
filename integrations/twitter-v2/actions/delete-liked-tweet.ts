import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tweet_id: z.string().describe('The ID of the liked tweet to remove. Example: "1346889436626259968"')
});

const ProviderUserSchema = z
    .object({
        data: z.object({
            id: z.string()
        })
    })
    .passthrough();

const ProviderUnlikeResponseSchema = z
    .object({
        data: z
            .object({
                liked: z.boolean()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    liked: z.boolean().optional()
});

const action = createAction({
    description: 'Remove a liked tweet (unlike) for the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-liked-tweet',
        group: 'Likes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tweet.read', 'users.read', 'like.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.x.com/x-api/users/lookup-ME#get-api-endpoint
        const userResponse = await nango.get({
            endpoint: '/2/users/me',
            retries: 3
        });

        const userData = ProviderUserSchema.parse(userResponse.data);
        const userId = userData.data.id;

        // https://docs.x.com/x-api/likes/manage-likes#delete-api-endpoint
        const response = await nango.delete({
            endpoint: `/2/users/${userId}/likes/${input.tweet_id}`,
            retries: 3
        });

        const parsed = ProviderUnlikeResponseSchema.parse(response.data);

        return {
            success: true,
            ...(parsed.data?.liked !== undefined && { liked: parsed.data.liked })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
