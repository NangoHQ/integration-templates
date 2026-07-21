import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Comment ID. Example: "6h78PmPWvxqw3H8q"'),
    content: z.string().describe('New comment content. Example: "Updated comment text"')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    task_id: z.string().optional().nullable(),
    project_id: z.string().optional().nullable(),
    item_id: z.string().optional().nullable(),
    content: z.string(),
    posted_at: z.string(),
    posted_uid: z.string(),
    uids_to_notify: z.array(z.string()).optional().nullable(),
    attachment: z.unknown().optional().nullable(),
    file_attachment: z.unknown().optional().nullable(),
    reactions: z.record(z.string(), z.array(z.string())).optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
    content: z.string(),
    posted_at: z.string(),
    posted_uid: z.string(),
    uids_to_notify: z.array(z.string()).optional(),
    attachment: z.unknown().optional(),
    reactions: z.record(z.string(), z.array(z.string())).optional()
});

const action = createAction({
    description: "Update a comment's content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#update-a-comment
            endpoint: `/api/v1/comments/${encodeURIComponent(input.id)}`,
            data: {
                content: input.content
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        const resolvedTaskId = providerComment.task_id ?? providerComment.item_id ?? undefined;
        const resolvedAttachment = providerComment.attachment ?? providerComment.file_attachment ?? undefined;

        return {
            id: providerComment.id,
            ...(resolvedTaskId !== undefined && { task_id: resolvedTaskId }),
            ...(providerComment.project_id !== undefined &&
                providerComment.project_id !== null && {
                    project_id: providerComment.project_id
                }),
            content: providerComment.content,
            posted_at: providerComment.posted_at,
            posted_uid: providerComment.posted_uid,
            ...(providerComment.uids_to_notify !== undefined &&
                providerComment.uids_to_notify !== null && {
                    uids_to_notify: providerComment.uids_to_notify
                }),
            ...(resolvedAttachment !== undefined && { attachment: resolvedAttachment }),
            ...(providerComment.reactions !== undefined &&
                providerComment.reactions !== null && {
                    reactions: providerComment.reactions
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
