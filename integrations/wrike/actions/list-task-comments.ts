import { z } from 'zod';
import { createAction } from 'nango';

const CommentSchema = z.object({
    id: z.string().describe('Unique comment identifier. Example: "IEAG5DAKIMCT73WX"'),
    authorId: z.string().describe('ID of the user who authored the comment. Example: "KUAZR5CO"'),
    text: z.string().describe('Comment body. HTML markup by default; plain text when plainText is true.'),
    createdDate: z.string().describe('Comment creation timestamp. Example: "2026-10-07T12:00:00Z"'),
    updatedDate: z.string().optional().describe('Last-updated timestamp. Wrike marks this field deprecated and returns the created date.'),
    taskId: z.string().optional().describe('ID of the task the comment belongs to. Example: "MAAAAAEQ_HoO"'),
    folderId: z.string().optional().describe('ID of the folder the comment belongs to, when the comment is on a folder rather than a task.'),
    attachmentIds: z.array(z.string()).optional().describe('IDs of files attached to the comment.'),
    type: z.string().optional().describe('Comment type. Example: "Regular"'),
    emailSubject: z.string().optional().describe('Subject line, present for email-originated comments.'),
    direction: z.string().optional().describe('Email direction, present for email-originated comments. Example: "Incoming"')
});

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task whose comments to list. Example: "MAAAAAEQ_HoO"'),
        plainText: z.boolean().optional().describe('Return comment text as plain text instead of HTML markup. Defaults to false (HTML).')
    })
    .describe('Input for listing the comments posted on a Wrike task.');

const OutputSchema = z
    .object({
        comments: z.array(CommentSchema).describe('Comments posted on the task, in the order returned by Wrike.')
    })
    .describe('Comments posted on the specified task.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(CommentSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the comments on a task without modifying any provider data.
 * @pitfalls: Comment text is HTML markup by default (mention/link tags included) unless plainText is true; a task with no comments returns an empty comments array rather than an error; updatedDate is deprecated and mirrors createdDate.
 */
const action = createAction({
    description: 'List comments posted on a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/gettaskssinglecomments
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/comments`,
            params: {
                ...(input.plainText !== undefined && { plainText: input.plainText ? 'true' : 'false' })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            comments: parsed.data.map((comment) => ({
                id: comment.id,
                authorId: comment.authorId,
                text: comment.text,
                createdDate: comment.createdDate,
                ...(comment.updatedDate != null && { updatedDate: comment.updatedDate }),
                ...(comment.taskId != null && { taskId: comment.taskId }),
                ...(comment.folderId != null && { folderId: comment.folderId }),
                ...(comment.attachmentIds != null && { attachmentIds: comment.attachmentIds }),
                ...(comment.type != null && { type: comment.type }),
                ...(comment.emailSubject != null && { emailSubject: comment.emailSubject }),
                ...(comment.direction != null && { direction: comment.direction })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
