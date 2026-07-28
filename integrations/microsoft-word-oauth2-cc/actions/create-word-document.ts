import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_CONTENT_BYTES = 250 * 1024 * 1024; // Graph's driveItem: put content endpoint supports up to 250 MB.

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    parentId: z.string().optional().describe('Parent folder item ID. If provided, the file is created in this folder instead of the root.'),
    path: z.string().optional().describe('Folder path within the drive root. Used if parentId is not provided. Example: "folder/subfolder"'),
    fileName: z.string().describe('Name of the file including .docx extension. Example: "document.docx"'),
    contentBase64: z
        .string()
        .min(1)
        .regex(BASE64_PATTERN, 'contentBase64 must be non-empty, valid base64-encoded data')
        .describe('Base64-encoded .docx file content. Must not exceed 250 MB decoded.')
});

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
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
        let itemPath: string;

        if (input.parentId) {
            itemPath = `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentId)}:/${encodedFileName}`;
        } else if (input.path) {
            const encodedPath = input.path.split('/').map(encodeURIComponent).join('/');
            itemPath = `/v1.0/drives/${encodeURIComponent(input.driveId)}/root:/${encodedPath}/${encodedFileName}`;
        } else {
            itemPath = `/v1.0/drives/${encodeURIComponent(input.driveId)}/root:/${encodedFileName}`;
        }

        const contentBuffer = Buffer.from(input.contentBase64, 'base64');

        if (contentBuffer.length > MAX_CONTENT_BYTES) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Decoded content is ${contentBuffer.length} bytes, which exceeds the 250 MB limit supported by this endpoint.`
            });
        }

        // Graph's simple-upload PUT below silently overwrites an existing file with the same name
        // instead of failing, which would defeat this action's "create new" semantics. Check first
        // and reject explicitly so callers who want to replace content use update-word-document-content.
        let alreadyExists = false;
        // @allowTryCatch existence pre-check: a 404 here is the expected/normal "safe to create" case.
        try {
            const existsResponse = await nango.get({ endpoint: itemPath, retries: 10 });
            alreadyExists = (existsResponse.status ?? 200) < 400;
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);
            if (!parsedError.success || parsedError.data.response.status !== 404) {
                throw error;
            }
        }

        if (alreadyExists) {
            throw new nango.ActionError({
                type: 'already_exists',
                message: `A file named "${input.fileName}" already exists at the target location. Use update-word-document-content to replace its content.`
            });
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
            endpoint: `${itemPath}:/content`,
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
