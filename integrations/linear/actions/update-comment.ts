import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to update. Example: "comment-uuid-123"'),
    body: z.string().describe('The updated comment body in markdown format. Example: "Updated comment text"')
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Update a comment on a Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) {
                        commentUpdate(id: $id, input: $input) {
                            success
                            comment {
                                id
                                body
                            }
                        }
                    }
                `,
                variables: {
                    id: input.commentId,
                    input: {
                        body: input.body
                    }
                }
            },
            retries: 3
        });

        const result = response.data?.data?.commentUpdate;

        if (!result || !result.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update comment',
                commentId: input.commentId
            });
        }

        return {
            id: result.comment.id,
            body: result.comment.body,
            success: result.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
