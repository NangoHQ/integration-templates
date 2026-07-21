import { z } from 'zod';
import { createAction } from 'nango';

const AttachmentSchema = z
    .object({
        file_name: z.string().optional(),
        file_type: z.string().optional(),
        file_url: z.string().optional(),
        resource_type: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    task_id: z.string().optional().describe('Task ID to attach the comment to. Example: "6h78Phpj8jH59jWq"'),
    project_id: z.string().optional().describe('Project ID to attach the comment to. Example: "6h78PW84RjxxRW8q"'),
    content: z.string().describe('Comment content. Example: "This is a comment"'),
    attachment: AttachmentSchema.optional()
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
    description: 'Create a comment on a task or a project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input['task_id'] === undefined && input['project_id'] === undefined) || (input['task_id'] !== undefined && input['project_id'] !== undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of task_id or project_id must be provided'
            });
        }

        const body: Record<string, unknown> = {
            content: input.content
        };

        if (input['task_id'] !== undefined) {
            body['task_id'] = input['task_id'];
        }

        if (input['project_id'] !== undefined) {
            body['project_id'] = input['project_id'];
        }

        if (input['attachment'] !== undefined) {
            body['attachment'] = input['attachment'];
        }

        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#create-a-comment
            endpoint: '/api/v1/comments',
            data: body,
            retries: 10
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
