import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('Comment ID to retrieve. Example: "123e4567-89ab-cdef-0123-456789abcdef"')
});

// Linear comment query response shape (camelCase from GraphQL)
const LinearCommentSchema = z.object({
    id: z.string(),
    body: z.string(),
    resolvedAt: z.union([z.string(), z.null()]),
    issue: z.union([
        z.object({
            id: z.string(),
            identifier: z.string(),
            title: z.string()
        }),
        z.null()
    ]),
    user: z.union([
        z.object({
            id: z.string(),
            name: z.string(),
            email: z.string()
        }),
        z.null()
    ])
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    resolved_at: z.union([z.string(), z.null()]),
    issue: z.union([
        z.object({
            id: z.string(),
            identifier: z.string(),
            title: z.string()
        }),
        z.null()
    ]),
    user: z.union([
        z.object({
            id: z.string(),
            name: z.string(),
            email: z.string()
        }),
        z.null()
    ])
});

const action = createAction({
    description: 'Retrieve a Linear comment by comment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetComment($id: String!) {
                comment(id: $id) {
                    id
                    body
                    resolvedAt
                    issue {
                        id
                        identifier
                        title
                    }
                    user {
                        id
                        name
                        email
                    }
                }
            }
        `;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: query,
                variables: {
                    id: input.comment_id
                }
            },
            retries: 3
        });

        // Check for GraphQL errors
        const errorResponse = z
            .object({
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .safeParse(response.data);

        if (errorResponse.success && errorResponse.data.errors) {
            const errors = errorResponse.data.errors;
            if (errors.length > 0 && errors[0]) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: errors[0].message
                });
            }
        }

        const responseData = z
            .object({
                data: z.object({
                    comment: z.union([LinearCommentSchema, z.null()])
                })
            })
            .safeParse(response.data);

        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API'
            });
        }

        const comment = responseData.data.data.comment;

        if (!comment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Comment with ID "${input.comment_id}" not found`,
                comment_id: input.comment_id
            });
        }

        return {
            id: comment.id,
            body: comment.body,
            resolved_at: comment.resolvedAt,
            issue: comment.issue,
            user: comment.user
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
