import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        commentId: z.string().describe('ID of the comment to update. Example: "ABCDEF0123456789"'),
        text: z.string().describe('New text for the comment. Cannot be empty; Wrike special HTML syntax is supported.')
    })
    .describe('Identifies the comment to update and the replacement text.');

const ProviderCommentSchema = z.object({
    id: z.string(),
    authorId: z.string().optional(),
    text: z.string(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    taskId: z.string().optional(),
    folderId: z.string().optional(),
    attachmentIds: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderCommentSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the updated comment.'),
        text: z.string().describe('The updated comment text.'),
        authorId: z.string().optional().describe('ID of the user who authored the comment.'),
        createdDate: z.string().optional().describe('Timestamp when the comment was created; unchanged by the update.'),
        updatedDate: z.string().optional().describe('Timestamp of the most recent comment modification.'),
        taskId: z.string().optional().describe('ID of the related task, when the comment belongs to a task.'),
        folderId: z.string().optional().describe('ID of the related folder, when the comment belongs to a folder.')
    })
    .describe('The comment as it appears after the update.');

/**
 * @tags: [write]
 * @tagReason: Updates the text of an existing provider comment.
 * @pitfalls: Editing replaces the entire comment body (not appended) and the text must be non-empty; Wrike only permits edits within 5 minutes of creation, after which updates fail with a misleading 403 "insufficient user rights" error.
 */
const action = createAction({
    description: 'Update the text of an existing comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['wsReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.wrike.com/reference/putcommentssingle
            endpoint: `/comments/${encodeURIComponent(input.commentId)}`,
            data: {
                text: input.text
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const comment = parsed.data[0];

        if (!comment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment could not be updated.',
                commentId: input.commentId
            });
        }

        return {
            id: comment.id,
            text: comment.text,
            ...(comment.authorId != null && { authorId: comment.authorId }),
            ...(comment.createdDate != null && { createdDate: comment.createdDate }),
            ...(comment.updatedDate != null && { updatedDate: comment.updatedDate }),
            ...(comment.taskId != null && { taskId: comment.taskId }),
            ...(comment.folderId != null && { folderId: comment.folderId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
