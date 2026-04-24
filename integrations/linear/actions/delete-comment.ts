import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to delete. Example: "abc123"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        commentDelete: z.object({
            success: z.boolean()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a comment from a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'mutation CommentDelete($id: String!) { commentDelete(id: $id) { success } }',
                variables: {
                    id: input.commentId
                }
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Linear API returned an empty response.'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Linear API returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        return {
            success: parsed.data.data.commentDelete.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
