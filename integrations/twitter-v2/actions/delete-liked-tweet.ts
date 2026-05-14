import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the tweet to delete. Example: "1346889436626259968"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            deleted: z.boolean()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a tweet owned by the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-liked-tweet',
        group: 'Tweets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tweet.read', 'tweet.write', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/delete-tweets-id
        const response = await nango.delete({
            endpoint: `/2/tweets/${input.id}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tweet not found or you do not have permission to delete it',
                id: input.id
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'forbidden',
                message: 'You do not have permission to delete this tweet. You can only delete tweets you own.',
                id: input.id
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No response data from X API',
                id: input.id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'X API returned errors',
                errors: providerResponse.errors,
                id: input.id
            });
        }

        return {
            id: input.id,
            deleted: providerResponse.data?.deleted ?? true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
