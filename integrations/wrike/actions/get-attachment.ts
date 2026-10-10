import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        attachmentId: z.string().min(1).describe('The opaque Wrike attachment ID to retrieve metadata for. Example: "IEAG5DAKIYX57P5D"')
    })
    .describe('Input identifying which Wrike attachment to retrieve.');

const AttachmentSchema = z
    .object({
        id: z.string().describe('The attachment ID.'),
        authorId: z.string().optional().describe('ID of the user who uploaded the attachment.'),
        name: z.string().optional().describe('The attachment filename.'),
        createdDate: z.string().optional().describe('Upload timestamp in ISO 8601 format. Example: "2026-10-07T01:48:57Z"'),
        version: z.number().optional().describe('The attachment version number.'),
        type: z
            .enum(['Google', 'DAM', 'OneDrive', 'Wrike', 'External', 'Box', 'SharePoint', 'DropBox', 'Whiteboard'])
            .optional()
            .describe('The attachment source/storage type. "Wrike" means the file content is stored by Wrike.'),
        contentType: z.string().optional().describe('The MIME content type of the attachment. Example: "image/jpeg"'),
        size: z.number().optional().describe('Attachment size in bytes. For external attachments this is -1.'),
        taskId: z.string().optional().describe('ID of the related task. Only one of taskId or folderId is present.'),
        folderId: z.string().optional().describe('ID of the related folder. Only one of taskId or folderId is present.'),
        commentId: z.string().optional().describe('ID of the related comment, when the attachment belongs to a comment.'),
        width: z.number().optional().describe('Image width in pixels, present when the attachment is an image.'),
        height: z.number().optional().describe('Image height in pixels, present when the attachment is an image.'),
        originVersionId: z.string().optional().describe('ID of the attachment version this version originated from.'),
        currentAttachmentId: z.string().optional().describe('ID of the current version of this attachment, when this is not the latest version.'),
        reviewIds: z.array(z.string()).optional().describe('IDs of reviews associated with the attachment.'),
        previewUrl: z.string().optional().describe('Link to the attachment preview, present when a preview is available.'),
        playlistUrl: z.string().optional().describe('Link to the video playlist, present for video attachments.'),
        url: z.string().optional().describe('Link to download the attachment, when the provider returns one.'),
        whiteboardId: z.string().optional().describe('ID of the associated whiteboard, when the attachment is a whiteboard.')
    })
    .describe('Metadata for a single Wrike attachment.');

const ResponseSchema = z.object({
    kind: z.string(),
    data: z.array(AttachmentSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single attachment's metadata from Wrike without modifying any provider resource.
 * @pitfalls: Returns attachment metadata only and never the file contents; an unknown or malformed attachment ID fails with a provider 400 invalid_request rather than an empty result.
 */
const action = createAction({
    description: "Retrieve a single attachment's metadata by ID (not its binary content).",
    version: '1.0.0',
    input: InputSchema,
    output: AttachmentSchema,

    exec: async (nango, input): Promise<z.infer<typeof AttachmentSchema>> => {
        // https://developers.wrike.com/reference/getattachmentsmulti
        const response = await nango.get({
            endpoint: `/attachments/${encodeURIComponent(input.attachmentId)}`,
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const attachment = parsed.data[0];

        if (!attachment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Attachment not found',
                attachmentId: input.attachmentId
            });
        }

        return attachment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
