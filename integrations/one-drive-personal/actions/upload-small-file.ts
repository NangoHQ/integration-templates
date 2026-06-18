import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parentItemId: z.string().describe('The ID of the parent item (folder) where the file will be uploaded. Example: "root" or a specific item ID.'),
    fileName: z.string().describe('The name of the file to be uploaded. Example: "document.txt"'),
    content: z.string().describe('The base64-encoded content of the file to upload. Always base64 encode the content before passing it here.'),
    contentType: z.string().optional().describe('The MIME type of the file content. Defaults to "text/plain" if not provided. Example: "application/json"')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
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
    description: 'Upload a small file in a single request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contentType = input.contentType || 'text/plain';

        // https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_put_content
        const response = await nango.put({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.parentItemId)}:/${encodeURIComponent(input.fileName)}:/content`,
            headers: {
                'Content-Type': contentType
            },
            data: Buffer.from(input.content, 'base64'),
            retries: 3
        });

        const driveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: driveItem.id,
            name: driveItem.name,
            ...(driveItem.size !== undefined && { size: driveItem.size }),
            ...(driveItem.webUrl !== undefined && { webUrl: driveItem.webUrl }),
            ...(driveItem.createdDateTime !== undefined && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: driveItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
