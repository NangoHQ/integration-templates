import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to update. Example: "12345"'),
    message: z.string().describe('The new text of the comment. Example: "Updated comment message"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    login: z.string().optional()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    is_reply_comment: z.boolean().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    created_by: ProviderUserSchema.optional(),
    item: ProviderItemSchema.optional(),
    tagged_message: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    isReplyComment: z.boolean().optional(),
    createdAt: z.string().optional(),
    modifiedAt: z.string().optional(),
    createdBy: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional(),
            login: z.string().optional()
        })
        .optional(),
    item: z
        .object({
            id: z.string(),
            type: z.string()
        })
        .optional(),
    taggedMessage: z.string().optional()
});

const action = createAction({
    description: 'Update a comment in Box',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/put-comments-id/
        const response = await nango.put({
            endpoint: `/2.0/comments/${input.commentId}`,
            data: {
                message: input.message
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found or could not be updated',
                commentId: input.commentId
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            type: providerComment.type,
            message: providerComment.message,
            ...(providerComment.is_reply_comment !== undefined && {
                isReplyComment: providerComment.is_reply_comment
            }),
            ...(providerComment.created_at && { createdAt: providerComment.created_at }),
            ...(providerComment.modified_at && { modifiedAt: providerComment.modified_at }),
            ...(providerComment.created_by && {
                createdBy: {
                    id: providerComment.created_by.id,
                    type: providerComment.created_by.type,
                    ...(providerComment.created_by.name && {
                        name: providerComment.created_by.name
                    }),
                    ...(providerComment.created_by.login && {
                        login: providerComment.created_by.login
                    })
                }
            }),
            ...(providerComment.item && {
                item: {
                    id: providerComment.item.id,
                    type: providerComment.item.type
                }
            }),
            ...(providerComment.tagged_message && {
                taggedMessage: providerComment.tagged_message
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
