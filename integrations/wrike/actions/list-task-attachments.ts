import { z } from 'zod';
import { createAction } from 'nango';

const AttachmentSchema = z.object({
    id: z.string().describe('Unique attachment ID. Example: "IEAG5DAKIYX57P5D"'),
    authorId: z.string().optional().describe('ID of the contact who uploaded the attachment.'),
    name: z.string().optional().describe('Attachment filename. Example: "Proof this image.jpg"'),
    createdDate: z.string().optional().describe('Upload timestamp in ISO 8601 format. Example: "2026-10-07T01:48:57Z"'),
    version: z.number().optional().describe('Attachment version number.'),
    type: z.string().optional().describe('Attachment source type, e.g. "Wrike" for files stored in Wrike or "Google"/"OneDrive"/"Box" for external links.'),
    contentType: z.string().optional().describe('MIME content type of the attachment. Example: "image/jpeg"'),
    size: z.number().optional().describe('File size in bytes. External attachments report -1.'),
    taskId: z.string().optional().describe('ID of the task the attachment belongs to.'),
    folderId: z.string().optional().describe('ID of the folder the attachment belongs to, when it is attached to a folder instead of a task.'),
    width: z.number().optional().describe('Image width in pixels, present for image attachments.'),
    height: z.number().optional().describe('Image height in pixels, present for image attachments.'),
    url: z.string().optional().describe('Temporary download URL on a separate storage host, returned only when withUrls is true and valid for 24 hours.'),
    originVersionId: z.string().optional().describe('ID of the first version of the attachment.'),
    currentAttachmentId: z.string().optional().describe('ID of the current attachment version.'),
    previewUrl: z.string().optional().describe('Link to download the external attachment preview, present when a preview is available.'),
    playlistUrl: z.string().optional().describe('Link to the video playlist, present for video attachments.'),
    reviewIds: z.array(z.string()).optional().describe('IDs of reviews associated with the attachment.'),
    commentId: z.string().optional().describe('ID of the related comment, when the attachment was added to a comment.'),
    whiteboardId: z.string().optional().describe('ID of the related whiteboard, when the attachment is a whiteboard.')
});

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task whose attachments to list. Example: "MAAAAAEQ_HoO"'),
        versions: z.boolean().optional().describe('When true, also return previous versions of each attachment in addition to the current version.'),
        withUrls: z.boolean().optional().describe('When true, include a temporary download URL for each attachment, valid for 24 hours.')
    })
    .describe('Input for listing the attachment metadata of a Wrike task.');

const ProviderResponseSchema = z.object({
    data: z.array(AttachmentSchema)
});

const OutputSchema = z
    .object({
        attachments: z.array(AttachmentSchema).describe('Attachment metadata records for the task. Empty when the task has no attachments.')
    })
    .describe('Attachment metadata records returned for a Wrike task.');

/**
 * @tags: [read]
 * @tagReason: Reads attachment metadata for a task without modifying any provider state.
 * @pitfalls: withUrls returns download links that expire after 24 hours and live on a separate storage host; versions=true adds previous versions as extra records sharing the same attachment; external-link attachments report size as -1.
 */
const action = createAction({
    description: 'List attachment metadata for files attached to a specific task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/gettaskssingleattachments
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/attachments`,
            params: {
                ...(input.versions !== undefined && { versions: String(input.versions) }),
                ...(input.withUrls !== undefined && { withUrls: String(input.withUrls) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            attachments: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
