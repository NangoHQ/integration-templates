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
    description: 'Replace the content of an existing presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contentType = input.contentType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        const buffer = Buffer.from(input.content, 'base64');

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
            ...(driveItem.size !== undefined && { size: driveItem.size }),
            ...(driveItem.webUrl !== undefined && { webUrl: driveItem.webUrl }),
            ...(driveItem.createdDateTime !== undefined && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: driveItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
