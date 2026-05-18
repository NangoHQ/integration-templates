import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tweet_id: z.string().describe('The ID of the tweet to remove from bookmarks. Example: "1234567890"')
});

const OutputSchema = z.object({
    bookmark_removed: z.boolean().describe('Whether the bookmark was successfully removed'),
    tweet_id: z.string().describe('The ID of the tweet that was removed from bookmarks')
});

const UserMeSchema = z.object({
    data: z.object({
        id: z.string()
    })
});

const action = createAction({
    description: 'Remove a tweet bookmark',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-bookmark',
        group: 'Bookmarks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bookmark.write', 'users.read', 'tweet.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.x.com/x-api/users/user-lookup-by-id
        const userResponse = await nango.get({
            endpoint: '/2/users/me',
            retries: 3
        });

        if (userResponse.status !== 200 || !userResponse.data) {
            throw new nango.ActionError({
                type: 'user_lookup_failed',
                message: 'Failed to retrieve authenticated user information',
                status: userResponse.status
            });
        }

        const parsedUser = UserMeSchema.safeParse(userResponse.data);

        if (!parsedUser.success) {
            throw new nango.ActionError({
                type: 'invalid_user_response',
                message: 'Failed to parse user response from X API',
                details: parsedUser.error.message
            });
        }

        const userId = parsedUser.data.data.id;

        // https://docs.x.com/x-api/introduction/bookmarks
        const response = await nango.delete({
            endpoint: `/2/users/${userId}/bookmarks/${input.tweet_id}`,
            retries: 2
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to remove bookmark: ${response.status}`,
                status: response.status,
                tweet_id: input.tweet_id
            });
        }

        return {
            bookmark_removed: true,
            tweet_id: input.tweet_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
