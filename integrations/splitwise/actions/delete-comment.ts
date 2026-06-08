import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Comment ID to delete. Example: 79800950')
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().nullable().optional(),
    user: z
        .object({
            id: z.number().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            picture: z
                .object({
                    medium: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().optional(),
    user: z
        .object({
            id: z.number().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            picture: z
                .object({
                    medium: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Delete or archive a comment in Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://dev.splitwise.com/
            endpoint: `/api/v3.0/delete_comment/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('comment' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Splitwise API: missing comment field'
            });
        }

        const providerComment = ProviderCommentSchema.parse(raw.comment);

        return {
            id: providerComment.id,
            ...(providerComment.content !== undefined && { content: providerComment.content }),
            ...(providerComment.comment_type !== undefined && { comment_type: providerComment.comment_type }),
            ...(providerComment.relation_type !== undefined && { relation_type: providerComment.relation_type }),
            ...(providerComment.relation_id !== undefined && { relation_id: providerComment.relation_id }),
            ...(providerComment.created_at !== undefined && { created_at: providerComment.created_at }),
            ...(providerComment.deleted_at != null && { deleted_at: providerComment.deleted_at }),
            ...(providerComment.user !== undefined && {
                user: {
                    ...(providerComment.user.id !== undefined && { id: providerComment.user.id }),
                    ...(providerComment.user.first_name !== undefined && { first_name: providerComment.user.first_name }),
                    ...(providerComment.user.last_name !== undefined && { last_name: providerComment.user.last_name }),
                    ...(providerComment.user.picture !== undefined && {
                        picture: {
                            ...(providerComment.user.picture.medium !== undefined && { medium: providerComment.user.picture.medium })
                        }
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
