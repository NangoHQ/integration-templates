import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The identifier of the comment to resolve. Example: "123e4567-e89b-12d3-a456-426614174000"'),
    resolvingCommentId: z
        .string()
        .optional()
        .describe('The identifier of the child comment that resolves the thread. If not provided, the thread is resolved without a specific resolving comment.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    comment: z.object({
        id: z.string(),
        resolvedAt: z.union([z.string(), z.null()])
    })
});

const action = createAction({
    description: 'Resolve a Linear comment thread',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/resolve-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CommentResolve($id: String!, $resolvingCommentId: String) {
                commentResolve(id: $id, resolvingCommentId: $resolvingCommentId) {
                    success
                    comment {
                        id
                        resolvedAt
                    }
                }
            }
        `;

        const variables = {
            id: input.commentId,
            resolvingCommentId: input.resolvingCommentId ?? null
        };

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 10
        });

        // Check for GraphQL errors
        if (response.data && response.data.errors && response.data.errors.length > 0) {
            const error = response.data.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: error.message || 'GraphQL error occurred',
                commentId: input.commentId
            });
        }

        if (!response.data || !response.data.data || !response.data.data.commentResolve) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Linear API',
                commentId: input.commentId
            });
        }

        const result = response.data.data.commentResolve;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'resolve_failed',
                message: 'Failed to resolve comment',
                commentId: input.commentId
            });
        }

        return {
            success: result.success,
            comment: {
                id: result.comment.id,
                resolvedAt: result.comment.resolvedAt ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
