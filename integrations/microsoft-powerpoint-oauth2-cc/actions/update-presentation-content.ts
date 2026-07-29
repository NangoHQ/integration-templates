import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The ID of the drive containing the presentation. Example: "b!PkCXTGMW..."'),
    itemId: z.string().describe('The ID of the presentation item to update. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"'),
    content: z.string().describe('The binary content of the presentation as a base64-encoded string.'),
    contentType: z
        .string()
        .optional()
        .describe('The MIME type of the content. Defaults to "application/vnd.openxmlformats-officedocument.presentationml.presentation".')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Replace the content of an existing presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contentType = input.contentType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.content) || input.content.length % 4 !== 0) {
            throw new nango.ActionError({
                type: 'invalid_content',
                message: 'The content field is not valid Base64.'
            });
        }

        const buffer = Buffer.from(input.content, 'base64');

        const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
        if (buffer.length > MAX_UPLOAD_BYTES) {
            throw new nango.ActionError({
                type: 'content_too_large',
                message: 'Decoded content exceeds the 250 MB limit supported by the direct content upload endpoint.'
            });
        }

        const response = await nango.put({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
            headers: {
                'Content-Type': contentType
            },
            data: buffer,
            retries: 1
        });

        const driveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: driveItem.id,
            name: driveItem.name,
            ...(driveItem.size != null && { size: driveItem.size }),
            ...(driveItem.webUrl != null && { webUrl: driveItem.webUrl }),
            ...(driveItem.createdDateTime != null && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.lastModifiedDateTime != null && { lastModifiedDateTime: driveItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
