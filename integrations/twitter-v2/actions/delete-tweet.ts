import { createAction } from 'nango';
import * as z from 'zod';

// Input schema for deleting a tweet
const DeleteTweetInputSchema = z.object({
    id: z.string().describe('The ID of the tweet to be deleted. Example: "1346889436626259968"')
});

// Response schema from X API
const DeleteTweetResponseSchema = z.object({
    data: z
        .object({
            deleted: z.boolean()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                detail: z.string().optional(),
                status: z.number().optional(),
                title: z.string().optional(),
                type: z.string().optional()
            })
        )
        .optional()
});

// Output schema for the action
const DeleteTweetOutputSchema = z.object({
    success: z.boolean(),
    deleted: z.boolean().optional(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a tweet in Twitter/X',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-tweet',
        group: 'Tweets'
    },
    scopes: ['tweet.read', 'tweet.write'],
    input: DeleteTweetInputSchema,
    output: DeleteTweetOutputSchema,

    exec: async (nango, input) => {
        // https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/delete-tweets-id
        const response = await nango.delete({
            endpoint: `/2/tweets/${input.id}`,
            retries: 2
        });

        const parsed = DeleteTweetResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from X API'
            });
        }

        const data = parsed.data;

        if (data.errors && data.errors.length > 0) {
            const firstError = data.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    message: firstError.detail || firstError.title || 'Failed to delete tweet'
                });
            }
        }

        if (data.data && data.data.deleted) {
            return {
                success: true,
                deleted: true
            };
        }

        return {
            success: false,
            error: 'Tweet was not deleted'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
