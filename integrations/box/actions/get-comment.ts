import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the comment to retrieve. Example: "12345"')
});

const UserMiniSchema = z.object({
    id: z.string(),
    type: z.literal('user'),
    name: z.string().optional(),
    login: z.string().optional()
});

const ItemReferenceSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    type: z.literal('comment'),
    is_reply_comment: z.boolean().optional(),
    message: z.string().optional(),
    tagged_message: z.string().optional(),
    created_by: UserMiniSchema.optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    item: ItemReferenceSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('comment'),
    is_reply_comment: z.boolean().optional(),
    message: z.string().optional(),
    tagged_message: z.string().optional(),
    created_by: UserMiniSchema.optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    item: ItemReferenceSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single comment from Box',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/get-comments-id/
        const response = await nango.get({
            endpoint: `/2.0/comments/${input.comment_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                comment_id: input.comment_id
            });
        }

        const comment = ProviderCommentSchema.parse(response.data);

        return {
            id: comment.id,
            type: comment.type,
            ...(comment.is_reply_comment !== undefined && { is_reply_comment: comment.is_reply_comment }),
            ...(comment.message !== undefined && { message: comment.message }),
            ...(comment.tagged_message !== undefined && { tagged_message: comment.tagged_message }),
            ...(comment.created_by !== undefined && { created_by: comment.created_by }),
            ...(comment.created_at !== undefined && { created_at: comment.created_at }),
            ...(comment.modified_at !== undefined && { modified_at: comment.modified_at }),
            ...(comment.item !== undefined && { item: comment.item })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
