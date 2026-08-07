import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Comment ID. Example: "005502bb-b9c5-4354-b5e6-6463c24a1806"'),
    body: z.string().describe('Updated comment body text.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    user: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    issue: z
        .object({
            id: z.string(),
            identifier: z.string().optional()
        })
        .nullable()
        .optional(),
    parent: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
    issueId: z.string().optional(),
    issueIdentifier: z.string().optional(),
    parentId: z.string().optional()
});

const action = createAction({
    description: 'Update a comment on a Linear issue.',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) {
                commentUpdate(id: $id, input: $input) {
                    success
                    comment {
                        id
                        body
                        createdAt
                        updatedAt
                        user {
                            id
                            name
                        }
                        issue {
                            id
                            identifier
                        }
                        parent {
                            id
                        }
                    }
                }
            }
        `;

        const variables = {
            id: input.id,
            input: {
                body: input.body
            }
        };

        const config: ProxyConfiguration = {
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables
            },
            retries: 10
        };

        const response = await nango.post(config);

        const result = z
            .object({
                data: z
                    .object({
                        commentUpdate: z
                            .object({
                                success: z.boolean(),
                                comment: ProviderCommentSchema.nullable()
                            })
                            .nullable()
                            .optional()
                    })
                    .nullable()
                    .optional(),
                errors: z
                    .array(
                        z.object({
                            message: z.string(),
                            extensions: z.record(z.string(), z.unknown()).optional()
                        })
                    )
                    .default([])
            })
            .parse(response.data);

        const firstError = result.errors[0];
        if (firstError != null) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message
            });
        }

        const commentUpdate = result.data?.commentUpdate;
        if (!commentUpdate || !commentUpdate.success || !commentUpdate.comment) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update comment.'
            });
        }

        const comment = commentUpdate.comment;

        return {
            id: comment.id,
            body: comment.body,
            ...(comment.createdAt != null && { createdAt: comment.createdAt }),
            ...(comment.updatedAt != null && { updatedAt: comment.updatedAt }),
            ...(comment.user != null && { userId: comment.user.id, userName: comment.user.name }),
            ...(comment.issue != null && { issueId: comment.issue.id, issueIdentifier: comment.issue.identifier }),
            ...(comment.parent != null && { parentId: comment.parent.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
