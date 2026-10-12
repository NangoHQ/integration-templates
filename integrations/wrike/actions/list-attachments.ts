import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const AttachmentSchema = z.object({
    id: z.string().describe('Unique attachment ID. Example: "IEAG5DAKIYX57P5D"'),
    authorId: z.string().optional().describe('ID of the user who uploaded the attachment.'),
    name: z.string().optional().describe('Attachment filename, including extension.'),
    createdDate: z.string().optional().describe('Upload date in yyyy-MM-ddTHH:mm:ssZ format.'),
    version: z.number().optional().describe('Attachment version number. Starts at 1 and increments with each new version.'),
    type: z
        .string()
        .optional()
        .describe(
            'Attachment source, e.g. "Wrike" for files stored by Wrike, or a cloud-storage type such as "Google", "OneDrive", "Box", "DropBox", or "SharePoint".'
        ),
    contentType: z.string().optional().describe('MIME content type of the file. Example: "image/jpeg"'),
    size: z.number().optional().describe('File size in bytes. External attachments report -1.'),
    taskId: z.string().optional().describe('ID of the related task. Present instead of folderId.'),
    folderId: z.string().optional().describe('ID of the related folder. Present instead of taskId.'),
    commentId: z.string().optional().describe('ID of the related comment, when the attachment is on a comment.'),
    width: z.number().optional().describe('Image width in pixels. Only present for image attachments.'),
    height: z.number().optional().describe('Image height in pixels. Only present for image attachments.'),
    originVersionId: z.string().optional().describe('ID of the first version of the attachment.'),
    currentAttachmentId: z.string().optional().describe('ID of the most recent version of the attachment.'),
    reviewIds: z.array(z.string()).optional().describe('IDs of reviews associated with the attachment.'),
    previewUrl: z.string().optional().describe('Link to an external attachment preview, when a preview is available.'),
    playlistUrl: z.string().optional().describe('Link to a video playlist, when applicable.'),
    url: z.string().optional().describe('Temporary download link. Only returned when withUrls is true, and valid for 24 hours.'),
    whiteboardId: z.string().optional().describe('ID of the linked whiteboard, when applicable.')
});

const InputSchema = z
    .object({
        createdDate: z
            .object({
                start: z.string().describe('Range start in yyyy-MM-ddTHH:mm:ssZ format.'),
                end: z.string().optional().describe('Range end in yyyy-MM-ddTHH:mm:ssZ format. Defaults to open-ended when omitted.')
            })
            .optional()
            .describe('Filter attachments by upload date. Wrike docs require this for the account-wide listing and limit the range to less than 31 days.'),
        versions: z.boolean().optional().describe('When true, also return previous versions of each attachment.'),
        withUrls: z.boolean().optional().describe('When true, include a temporary download URL on each attachment (valid for 24 hours).')
    })
    .describe('Filters for listing attachment metadata across the Wrike account.');

const OutputSchema = z
    .object({
        attachments: z.array(AttachmentSchema).describe('Attachment metadata records across the account. No file contents are downloaded.')
    })
    .describe('Attachment metadata returned by the Wrike account-wide attachments listing.');

const AttachmentsResponseSchema = z.object({
    kind: z.string(),
    data: z.array(AttachmentSchema)
});

/**
 * @tags: [read]
 * @tagReason: Only reads attachment metadata from Wrike; it does not modify any provider state.
 * @pitfalls: Wrike's docs state createdDate is required for the account-wide listing and its range must be under 31 days, though a live call on this account also returned results without it; download URLs are included only when withUrls is true and expire after 24 hours.
 */
const action = createAction({
    description:
        "List attachment metadata (filename, size, content type, dimensions) across the account. Does not download file contents - metadata only, per this registry's convention of excluding binary upload/download actions.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.createdDate !== undefined) {
            params['createdDate'] = JSON.stringify({
                start: input.createdDate.start,
                ...(input.createdDate.end !== undefined && { end: input.createdDate.end })
            });
        }
        if (input.versions !== undefined) {
            params['versions'] = String(input.versions);
        }
        if (input.withUrls !== undefined) {
            params['withUrls'] = String(input.withUrls);
        }

        const config: ProxyConfiguration = {
            // https://developers.wrike.com/reference/getattachmentsempty
            endpoint: '/attachments',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = AttachmentsResponseSchema.parse(response.data);

        return {
            attachments: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
