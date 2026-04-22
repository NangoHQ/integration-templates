import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The identifier of the comment to unresolve. Example: "comment-uuid-123"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    url: z.union([z.string(), z.null()]),
    resolved_at: z.union([z.string(), z.null()]),
    resolving_comment_id: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Reopen a previously resolved Linear comment thread',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unresolve-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Mutation
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CommentUnresolve($id: String!) {
                        commentUnresolve(id: $id) {
                            success
                            comment {
                                id
                                url
                                resolvedAt
                                resolvingCommentId
                            }
                        }
                    }
                `,
                variables: {
                    id: input.comment_id
                }
            },
            retries: 3
        });

        const data = response.data;

        // Handle GraphQL errors
        if (data && Array.isArray(data.errors) && data.errors.length > 0) {
            const error = data.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: error.message || 'GraphQL operation failed',
                comment_id: input.comment_id
            });
        }

        if (
            !data ||
            typeof data !== 'object' ||
            !data.data ||
            typeof data.data !== 'object' ||
            !data.data.commentUnresolve ||
            typeof data.data.commentUnresolve !== 'object'
        ) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected API response structure',
                comment_id: input.comment_id
            });
        }

        const result = data.data.commentUnresolve;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'unresolve_failed',
                message: 'Failed to unresolve comment',
                comment_id: input.comment_id
            });
        }

        return {
            id: result.comment.id,
            success: result.success,
            url: result.comment.url ?? null,
            resolved_at: result.comment.resolvedAt ?? null,
            resolving_comment_id: result.comment.resolvingCommentId ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
