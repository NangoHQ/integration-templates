import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the comment to update. Example: "comment-id-123"'),
    body: z.string().describe('The new text content for the comment.')
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            commentUpdate: z
                .object({
                    success: z.boolean(),
                    comment: z
                        .object({
                            id: z.string(),
                            body: z.string().nullable().optional()
                        })
                        .nullable()
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string().optional()
});

const action = createAction({
    description: 'Update a comment on a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `mutation UpdateComment($id: String!, $body: String!) {
  commentUpdate(id: $id, input: { body: $body }) {
    success
    comment {
      id
      body
    }
  }
}`,
                variables: {
                    id: input.id,
                    body: input.body
                }
            },
            retries: 1
        });

        const payload = GraphQLResponseSchema.parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: payload.errors.map((e) => e.message).join(', ')
            });
        }

        const commentUpdate = payload.data?.commentUpdate;
        if (!commentUpdate || !commentUpdate.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Comment update was not successful.'
            });
        }

        if (!commentUpdate.comment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Updated comment was not returned.'
            });
        }

        return {
            id: commentUpdate.comment.id,
            ...(commentUpdate.comment.body != null && { body: commentUpdate.comment.body })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
