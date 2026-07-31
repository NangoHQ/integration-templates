import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!abc123"'),
    parentId: z.string().optional().describe('Parent folder item ID. Omit to upload to the drive root.'),
    filename: z.string().describe('File name without the .pptx extension. Example: "my-presentation"'),
    content: z.string().describe('Base64-encoded raw .pptx file bytes.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Upload a new .pptx presentation to a drive folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
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

        const endpoint = input.parentId
            ? `v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentId)}:/${encodeURIComponent(input.filename)}.pptx:/content`
            : `v1.0/drives/${encodeURIComponent(input.driveId)}/root:/${encodeURIComponent(input.filename)}.pptx:/content`;

        const response = await nango.put({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
            endpoint,
            data: buffer,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            },
            retries: 3
        });

        const driveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: driveItem.id,
            name: driveItem.name,
            ...(driveItem.webUrl != null && { webUrl: driveItem.webUrl }),
            ...(driveItem.size != null && { size: driveItem.size }),
            ...(driveItem.createdDateTime != null && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.lastModifiedDateTime != null && { lastModifiedDateTime: driveItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
