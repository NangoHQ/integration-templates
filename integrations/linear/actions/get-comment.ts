import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('Linear comment ID. Example: "comment-id-123"')
});

const ProviderIssueSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    resolvedAt: z.string().nullable().optional(),
    issue: ProviderIssueSchema.nullable().optional(),
    user: ProviderUserSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    resolved: z.boolean(),
    resolvedAt: z.string().optional(),
    issue: z
        .object({
            id: z.string(),
            identifier: z.string().optional(),
            title: z.string().optional()
        })
        .optional(),
    user: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
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
    scopes: [],

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
                query,
                variables: {
                    id: input.commentId
                }
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z
                    .object({
                        comment: ProviderCommentSchema.nullable().optional()
                    })
                    .optional(),
                errors: z
                    .array(
                        z.object({
                            message: z.string(),
                            extensions: z.record(z.string(), z.unknown()).optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors[0]?.message || 'Linear GraphQL error',
                errors: providerResponse.errors
            });
        }

        const comment = providerResponse.data?.comment;
        if (!comment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                commentId: input.commentId
            });
        }

        return {
            id: comment.id,
            ...(comment.body !== undefined && { body: comment.body }),
            resolved: comment.resolvedAt != null,
            ...(comment.resolvedAt != null && { resolvedAt: comment.resolvedAt }),
            ...(comment.issue != null && {
                issue: {
                    id: comment.issue.id,
                    ...(comment.issue.identifier !== undefined && { identifier: comment.issue.identifier }),
                    ...(comment.issue.title !== undefined && { title: comment.issue.title })
                }
            }),
            ...(comment.user != null && {
                user: {
                    id: comment.user.id,
                    ...(comment.user.name !== undefined && { name: comment.user.name }),
                    ...(comment.user.email !== undefined && { email: comment.user.email })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
