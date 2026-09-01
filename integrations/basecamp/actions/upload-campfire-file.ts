import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().int().describe('Basecamp project ID (bucket ID) that contains the Campfire. Example: 48644099'),
        chatId: z.number().int().describe('Campfire chat ID to upload the file into. Example: 10239340942'),
        name: z.string().describe('File name including extension. Example: "report.txt"'),
        content: z.string().describe('Base64-encoded file content to upload as raw binary data.'),
        contentType: z.string().describe('MIME type of the file. Example: "text/plain" or "image/png"')
    })
    .describe('Input to upload a file into a Basecamp Campfire chat.');

const ProviderAttachmentSchema = z.object({
    title: z.string().optional(),
    url: z.string().optional(),
    filename: z.string().optional(),
    content_type: z.string().optional(),
    byte_size: z.number().optional(),
    download_url: z.string().optional()
});

const ProviderOutputSchema = z.object({
    id: z.number().optional(),
    status: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    attachments: z.array(ProviderAttachmentSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created upload line.'),
        status: z.string().describe('Status of the upload line.'),
        title: z.string().describe('Title of the upload, typically the file name.'),
        type: z.string().describe('Type of the Basecamp recording.'),
        created_at: z.string().describe('ISO 8601 timestamp when the upload was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the upload was last updated.'),
        attachments: z
            .array(
                z.object({
                    title: z.string().optional().describe('Attachment title.'),
                    url: z.string().optional().describe('URL to the attachment preview.'),
                    filename: z.string().optional().describe('Original file name.'),
                    content_type: z.string().optional().describe('MIME type of the attachment.'),
                    byte_size: z.number().optional().describe('Size of the attachment in bytes.'),
                    download_url: z.string().optional().describe('Direct download URL for the attachment.')
                })
            )
            .describe('Array of file attachments included in this upload line.')
    })
    .describe('Output of a file uploaded into a Basecamp Campfire chat.');

/**
 * @tags: [write]
 * @tagReason: Creates a new file upload in a Campfire chat.
 */
const action = createAction({
    description: 'Upload a file directly into a Campfire as a chat attachment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const buffer = Buffer.from(input.content, 'base64');

        // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md#upload-a-file-to-a-campfire
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/chats/${encodeURIComponent(input.chatId)}/uploads.json`,
            params: {
                name: input.name
            },
            headers: {
                'Content-Type': input.contentType,
                'Content-Length': String(buffer.length)
            },
            data: buffer,
            retries: 10
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        if (!providerOutput.id) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider response did not include an upload ID.'
            });
        }

        return {
            id: providerOutput.id,
            status: providerOutput.status ?? 'unknown',
            title: providerOutput.title ?? input.name,
            type: providerOutput.type ?? 'Chat::Lines::Upload',
            created_at: providerOutput.created_at ?? new Date().toISOString(),
            updated_at: providerOutput.updated_at ?? new Date().toISOString(),
            attachments:
                providerOutput.attachments?.map((att) => ({
                    title: att.title,
                    url: att.url,
                    filename: att.filename,
                    content_type: att.content_type,
                    byte_size: att.byte_size,
                    download_url: att.download_url
                })) ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
