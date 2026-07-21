import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('Comment ID. Example: "6h78PmPWvxqw3H8q"')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    posted_uid: z.string(),
    content: z.string(),
    file_attachment: z.unknown().nullable().optional(),
    uids_to_notify: z.array(z.string()).nullable().optional(),
    is_deleted: z.boolean(),
    posted_at: z.string(),
    reactions: z.record(z.string(), z.array(z.string())).nullable().optional(),
    item_id: z.string().optional(),
    project_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    posted_uid: z.string(),
    content: z.string(),
    file_attachment: z.unknown().nullable().optional(),
    uids_to_notify: z.array(z.string()).nullable().optional(),
    is_deleted: z.boolean(),
    posted_at: z.string(),
    reactions: z.record(z.string(), z.array(z.string())).nullable().optional(),
    item_id: z.string().optional(),
    project_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1#get-a-comment
            endpoint: '/api/v1/comments/' + encodeURIComponent(input.comment_id),
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                comment_id: input.comment_id
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            posted_uid: providerComment.posted_uid,
            content: providerComment.content,
            is_deleted: providerComment.is_deleted,
            posted_at: providerComment.posted_at,
            ...(providerComment.file_attachment !== undefined && { file_attachment: providerComment.file_attachment }),
            ...(providerComment.uids_to_notify !== undefined && { uids_to_notify: providerComment.uids_to_notify }),
            ...(providerComment.reactions !== undefined && { reactions: providerComment.reactions }),
            ...(providerComment.item_id !== undefined && { item_id: providerComment.item_id }),
            ...(providerComment.project_id !== undefined && { project_id: providerComment.project_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
