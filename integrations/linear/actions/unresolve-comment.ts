import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Comment ID. Example: "005502bb-b9c5-4354-b5e6-6463c24a1806"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        commentUnresolve: z.object({
            success: z.boolean(),
            comment: z.object({
                id: z.string(),
                resolvedAt: z.string().nullable().optional()
            })
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    resolvedAt: z.string().nullable().optional()
});

const action = createAction({
    description: 'Reopen a previously resolved Linear comment thread.',
    version: '1.0.3',
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
        const result = parsed.data.commentUnresolve;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'unresolve_failed',
                message: 'Failed to unresolve comment',
                commentId: input.id
            });
        }

        return {
            id: result.comment.id,
            ...(result.comment.resolvedAt !== undefined && { resolvedAt: result.comment.resolvedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
