import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    parentId: z.string().optional().describe('Parent folder item ID. If provided, the file is created in this folder instead of the root.'),
    path: z.string().optional().describe('Folder path within the drive root. Used if parentId is not provided. Example: "folder/subfolder"'),
    fileName: z.string().describe('Name of the file including .docx extension. Example: "document.docx"'),
    contentBase64: z.string().describe('Base64-encoded .docx file content')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    mimeType: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Upload a new Word document to a drive folder',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input) => {
        const encodedFileName = encodeURIComponent(input.fileName);
        let endpoint: string;

        if (input.parentId) {
            endpoint = `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentId)}:/${encodedFileName}:/content`;
        } else if (input.path) {
            const encodedPath = input.path.split('/').map(encodeURIComponent).join('/');
            endpoint = `/v1.0/drives/${encodeURIComponent(input.driveId)}/root:/${encodedPath}/${encodedFileName}:/content`;
        } else {
            endpoint = `/v1.0/drives/${encodeURIComponent(input.driveId)}/root:/${encodedFileName}:/content`;
        }

        const contentBuffer = Buffer.from(input.contentBase64, 'base64');

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
            endpoint,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            },
            data: contentBuffer,
            retries: 3
        };

        const response = await nango.put(config);

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.size !== undefined && { size: providerItem.size }),
            ...(providerItem.webUrl !== undefined && { webUrl: providerItem.webUrl }),
            ...(providerItem.file?.mimeType !== undefined && { mimeType: providerItem.file.mimeType }),
            ...(providerItem.createdDateTime !== undefined && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
