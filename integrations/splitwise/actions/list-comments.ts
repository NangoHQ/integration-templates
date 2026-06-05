import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    expense_id: z.number().describe('Expense ID. Example: 855870953')
});

const ProviderCommentUserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            medium: z.string().optional()
        })
        .optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    content: z.string(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().nullable().optional(),
    user: ProviderCommentUserSchema.optional()
});

const ProviderResponseSchema = z.object({
    comments: z.array(ProviderCommentSchema)
});

const CommentUserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            medium: z.string().optional()
        })
        .optional()
});

const CommentSchema = z.object({
    id: z.number(),
    content: z.string(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().optional(),
    user: CommentUserSchema.optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema)
});

const action = createAction({
    description: 'List comments from Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://dev.splitwise.com/
            endpoint: '/api/v3.0/get_comments',
            params: {
                expense_id: input.expense_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            comments: providerResponse.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                ...(comment.comment_type !== undefined && { comment_type: comment.comment_type }),
                ...(comment.relation_type !== undefined && { relation_type: comment.relation_type }),
                ...(comment.relation_id !== undefined && { relation_id: comment.relation_id }),
                ...(comment.created_at !== undefined && { created_at: comment.created_at }),
                ...(comment.deleted_at != null && { deleted_at: comment.deleted_at }),
                ...(comment.user !== undefined && {
                    user: {
                        id: comment.user.id,
                        ...(comment.user.first_name !== undefined && { first_name: comment.user.first_name }),
                        ...(comment.user.last_name !== undefined && { last_name: comment.user.last_name }),
                        ...(comment.user.picture !== undefined && {
                            picture: {
                                ...(comment.user.picture.medium !== undefined && { medium: comment.user.picture.medium })
                            }
                        })
                    }
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
