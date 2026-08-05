import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Comment ID. Example: "005502bb-b9c5-4354-b5e6-6463c24a1806"')
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            commentUnresolve: z
                .object({
                    success: z.boolean(),
                    lastSyncId: z.union([z.string(), z.number()]),
                    comment: z.object({
                        id: z.string(),
                        resolvedAt: z.string().nullable().optional()
                    })
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the operation was successful.'),
    lastSyncId: z.string().describe('The identifier of the last sync operation.'),
    commentId: z.string().describe('The identifier of the unresolved comment.'),
    resolvedAt: z.string().nullable().optional().describe('When the comment was resolved. Null once the thread has been reopened.')
});

const action = createAction({
    description: 'Reopen a previously resolved Linear comment thread.',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `mutation CommentUnresolve($id: String!) {
                    commentUnresolve(id: $id) {
                        success
                        lastSyncId
                        comment {
                            id
                            resolvedAt
                        }
                    }
                }`,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((error) => error.message).join(', ')
            });
        }

        const result = parsed.data?.commentUnresolve;

        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Linear API did not return a commentUnresolve payload.'
            });
        }

        if (!result.success) {
            throw new nango.ActionError({
                type: 'unresolve_failed',
                message: 'Failed to unresolve comment',
                commentId: input.id
            });
        }

        return {
            success: result.success,
            lastSyncId: String(result.lastSyncId),
            commentId: result.comment.id,
            ...(result.comment.resolvedAt !== undefined && { resolvedAt: result.comment.resolvedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
