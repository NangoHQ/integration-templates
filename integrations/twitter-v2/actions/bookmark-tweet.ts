import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the authenticated source User for whom to add bookmarks. Example: "2244994945"'),
    tweetId: z.string().describe('The ID of the Tweet to bookmark. Example: "1460323737035677698"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        bookmarked: z.boolean()
    })
});

const OutputSchema = z.object({
    bookmarked: z.boolean()
});

const action = createAction({
    description: 'Bookmark a tweet for an authenticated user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tweet.read', 'users.read', 'bookmark.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.x.com/x-api/users/create-bookmark
            endpoint: `/2/users/${input.userId}/bookmarks`,
            data: {
                tweet_id: input.tweetId
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            bookmarked: providerResponse.data.bookmarked
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
