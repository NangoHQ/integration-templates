import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The ID of the issue to comment on. Example: "issue-123"'),
    body: z.string().describe('The comment body text. Example: "This is a comment"'),
    parentId: z.string().optional().describe('The ID of the parent comment if this is a reply. Example: "comment-456"')
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string(),
    userId: z.union([z.string(), z.null()]),
    userName: z.union([z.string(), z.null()]),
    issueId: z.string(),
    issueIdentifier: z.union([z.string(), z.null()]),
    parentId: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a comment on a Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CommentCreate($input: CommentCreateInput!) {
                commentCreate(input: $input) {
                    success
                    comment {
                        id
                        body
                        createdAt
                        parentId
                        user {
                            id
                            name
                        }
                        issue {
                            id
                            identifier
                        }
                    }
                }
            }
        `;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    input: {
                        issueId: input.issueId,
                        body: input.body,
                        ...(input.parentId && { parentId: input.parentId })
                    }
                }
            },
            retries: 3
        });

        if (!response.data?.data?.commentCreate?.success) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create comment',
                response: response.data
            });
        }

        const comment = response.data.data.commentCreate.comment;

        return {
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            userId: comment.user?.id ?? null,
            userName: comment.user?.name ?? null,
            issueId: comment.issue?.id ?? input.issueId,
            issueIdentifier: comment.issue?.identifier ?? null,
            parentId: comment.parentId ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
