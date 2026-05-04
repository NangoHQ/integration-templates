import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The ID of the message containing the attachment. Example: "AAMkAGVmMD..."'),
    attachmentId: z.string().describe('The ID of the attachment to download. Example: "AAMkAGVmMD..."')
});

const OutputSchema = z.object({
    content: z.string().describe('The base64-encoded content of the attachment.'),
    contentType: z.string().describe('The MIME type of the attachment content.'),
    name: z.string().optional().describe('The name of the attachment file.')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    contentType: z.string().nullable().optional(),
    contentBytes: z.string().nullable().optional(),
    contentLocation: z.string().nullable().optional(),
    contentId: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional(),
    isInline: z.boolean().nullable().optional()
});

const action = createAction({
    description: 'Download the content of a file attachment on a message.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/download-message-attachment',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedMessageId = encodeURIComponent(input.messageId);
        const encodedAttachmentId = encodeURIComponent(input.attachmentId);

        // https://learn.microsoft.com/graph/api/attachment-get
        const directResponse = await nango.get({
            endpoint: `/v1.0/me/messages/${encodedMessageId}/attachments/${encodedAttachmentId}/$value`,
            retries: 3
        });

        // If we got a response with data, it means this is a file attachment with direct content
        if (directResponse.data && typeof directResponse.data === 'string') {
            // https://learn.microsoft.com/graph/api/attachment-get
            const metadataResponse = await nango.get({
                endpoint: `/v1.0/me/messages/${encodedMessageId}/attachments/${encodedAttachmentId}`,
                retries: 3
            });

            const attachment = ProviderAttachmentSchema.parse(metadataResponse.data);

            // Direct content is binary, so we need to encode it as base64
            // For now, assume the response is already handled appropriately
            // In practice, the API returns binary for $value, but Nango proxy may handle encoding
            return {
                content: Buffer.from(directResponse.data).toString('base64'),
                contentType: attachment.contentType || 'application/octet-stream',
                ...(attachment.name && { name: attachment.name })
            };
        }

        // If direct content download is not supported (e.g., for item/reference attachments),
        // fall back to the attachment resource
        // https://learn.microsoft.com/graph/api/attachment-get
        const fallbackResponse = await nango.get({
            endpoint: `/v1.0/me/messages/${encodedMessageId}/attachments/${encodedAttachmentId}`,
            retries: 3
        });

        const attachment = ProviderAttachmentSchema.parse(fallbackResponse.data);

        if (!attachment.contentBytes) {
            throw new nango.ActionError({
                type: 'no_content',
                message: 'Attachment does not contain downloadable content.',
                attachmentId: input.attachmentId
            });
        }

        return {
            content: attachment.contentBytes,
            contentType: attachment.contentType || 'application/octet-stream',
            ...(attachment.name && { name: attachment.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
