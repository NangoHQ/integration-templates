import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to delete. Example: "abc123-def456"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deletedCommentId: z.string()
});

const CommentDeleteResultSchema = z.object({
    success: z.boolean()
});

const GraphQLDataSchema = z.object({
    commentDelete: CommentDeleteResultSchema
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: GraphQLDataSchema.optional(),
    errors: z.optional(z.array(GraphQLErrorSchema))
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

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CommentDelete($id: String!) {
                commentDelete(id: $id) {
                    success
                }
            }
        `;

        const variables = {
            id: input.commentId
        };

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const validationResult = GraphQLResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const responseBody = validationResult.data;

        if (responseBody.errors && responseBody.errors.length > 0) {
            const firstError = responseBody.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message,
                    code: firstError.extensions?.['code']
                });
            }
        }

        if (!responseBody.data || responseBody.data.commentDelete.success !== true) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Comment deletion was not successful'
            });
        }

        return {
            success: true,
            deletedCommentId: input.commentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
