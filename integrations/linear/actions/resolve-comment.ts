import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the comment to resolve. Example: "comment-id-123"'),
    resolvingCommentId: z
        .string()
        .optional()
        .describe('The identifier of the child comment that resolves the thread. If not provided, the thread is resolved without a specific resolving comment.')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            commentResolve: z.object({
                success: z.boolean(),
                lastSyncId: z.number().optional(),
                comment: z
                    .object({
                        id: z.string()
                    })
                    .optional()
                    .nullable()
            })
        })
        .optional()
        .nullable(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    commentId: z.string().optional(),
    lastSyncId: z.number().optional()
});

const action = createAction({
    description: 'Resolve a Linear comment thread.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/resolve-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
            endpoint: '/graphql',
            data: {
                query: `
                    mutation commentResolve($id: String!, $resolvingCommentId: String) {
                        commentResolve(id: $id, resolvingCommentId: $resolvingCommentId) {
                            success
                            lastSyncId
                            comment {
                                id
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    ...(input.resolvingCommentId !== undefined && { resolvingCommentId: input.resolvingCommentId })
                }
            },
            retries: 1
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (providerData.errors && providerData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerData.errors.map((e) => e.message).join(', ')
            });
        }

        if (!providerData.data || !providerData.data.commentResolve) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const payload = providerData.data.commentResolve;

        if (!payload.success) {
            throw new nango.ActionError({
                type: 'resolve_failed',
                message: 'Failed to resolve comment',
                commentId: input.id
            });
        }

        return {
            success: payload.success,
            ...(payload.comment?.id != null && { commentId: payload.comment.id }),
            ...(payload.lastSyncId != null && { lastSyncId: payload.lastSyncId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
