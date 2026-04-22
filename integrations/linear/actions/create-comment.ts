import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id: z.string().describe('The ID of the issue to comment on. Example: "issue-123"'),
    body: z.string().describe('The comment body text. Example: "This is a comment"'),
    parent_id: z.string().optional().describe('The ID of the parent comment if this is a reply. Example: "comment-456"')
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    created_at: z.string(),
    user_id: z.union([z.string(), z.null()]),
    user_name: z.union([z.string(), z.null()]),
    issue_id: z.string(),
    issue_identifier: z.union([z.string(), z.null()]),
    parent_id: z.union([z.string(), z.null()])
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
                        issueId: input.issue_id,
                        body: input.body,
                        ...(input.parent_id && { parentId: input.parent_id })
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
            created_at: comment.createdAt,
            user_id: comment.user?.id ?? null,
            user_name: comment.user?.name ?? null,
            issue_id: comment.issue?.id ?? input.issue_id,
            issue_identifier: comment.issue?.identifier ?? null,
            parent_id: comment.parentId ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
