import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task to comment on. Example: "MAAAAAEQ_HoO".'),
        text: z.string().min(1).describe('Comment text; must not be empty. Example: "Looks good, shipping this.".')
    })
    .describe('Input for posting a new comment on a Wrike task.');

const ProviderCommentSchema = z.object({
    id: z.string(),
    authorId: z.string().optional(),
    text: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    taskId: z.string().optional(),
    attachmentIds: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCommentSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the created comment.'),
        authorId: z.string().optional().describe('ID of the comment author (the connected Wrike user).'),
        text: z.string().optional().describe('Text content of the created comment.'),
        createdDate: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        taskId: z.string().optional().describe('ID of the task the comment was posted on.'),
        attachmentIds: z.array(z.string()).optional().describe('IDs of attachments linked to the comment, if any.')
    })
    .describe('The comment created on the Wrike task.');

/**
 * @tags: [write]
 * @tagReason: Creates a new comment on a Wrike task; it does not read or delete existing provider data.
 * @pitfalls: Comment text is interpreted as HTML by default, so special characters such as `<` are parsed as markup and cannot be forced to render literally through this action; the returned `updatedDate` is deprecated and mirrors `createdDate` rather than tracking edits.
 */
const action = createAction({
    description: 'Post a new comment on a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['wsReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.wrike.com/reference/posttaskssinglecomments.md
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/comments`,
            data: {
                text: input.text
            },
            // Non-idempotent create: a retry after a lost response would post a duplicate comment.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 for this non-idempotent write
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const comment = parsed.data[0];

        if (!comment) {
            throw new nango.ActionError({
                type: 'comment_not_created',
                message: 'Wrike did not return the created comment.'
            });
        }

        return {
            id: comment.id,
            ...(comment.authorId != null && { authorId: comment.authorId }),
            ...(comment.text != null && { text: comment.text }),
            ...(comment.createdDate != null && { createdDate: comment.createdDate }),
            ...(comment.updatedDate != null && { updatedDate: comment.updatedDate }),
            ...(comment.taskId != null && { taskId: comment.taskId }),
            ...(comment.attachmentIds != null && { attachmentIds: comment.attachmentIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
