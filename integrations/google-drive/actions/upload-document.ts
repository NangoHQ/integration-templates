import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the file to create. Example: "document.txt"'),
    content: z.string().describe('The file content as plain text or base64 encoded string'),
    mimeType: z.string().describe('The MIME type of the file. Example: "text/plain", "application/pdf"'),
    isBase64: z.boolean().optional().describe('Whether the content is base64 encoded. Defaults to false'),
    folderId: z.string().optional().describe('The ID of the folder to upload the file into. If not provided, defaults to root. Example: "1a2b3c4d5e6f7g8h"'),
    description: z.string().optional().describe('A description of the file')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created file'),
    name: z.string().describe('The name of the created file'),
    mimeType: z.string().describe('The MIME type of the file'),
    webViewLink: z.string().optional().describe('A link for opening the file in a relevant Google editor or viewer'),
    webContentLink: z.string().optional().describe('A link for downloading the content of the file in a browser')
});

const action = createAction({
    description: 'Upload plain text or base64 file content up to 5 MB, optionally into a folder with a description; defaults to root',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/upload-document',
        group: 'Files'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Decode base64 content if needed
        let fileContent: string;
        if (input.isBase64) {
            fileContent = Buffer.from(input.content, 'base64').toString('binary');
        } else {
            fileContent = input.content;
        }

        // Step 1: Create file metadata
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
        const metadataBody: Record<string, unknown> = {
            name: input.name,
            mimeType: input.mimeType
        };

        if (input.description) {
            metadataBody['description'] = input.description;
        }

        if (input.folderId) {
            metadataBody['parents'] = [input.folderId];
        }

        const createResponse = await nango.post({
            endpoint: '/drive/v3/files',
            params: {
                fields: 'id,name,mimeType,webViewLink,webContentLink'
            },
            data: metadataBody,
            retries: 3
        });

        if (!createResponse.data || !createResponse.data.id) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create file metadata in Google Drive'
            });
        }

        const fileId = createResponse.data.id;

        // Step 2: Upload content using media upload
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update
        const contentResponse = await nango.patch({
            endpoint: `/upload/drive/v3/files/${fileId}`,
            params: {
                uploadType: 'media',
                fields: 'id,name,mimeType,webViewLink,webContentLink'
            },
            headers: {
                'Content-Type': input.mimeType
            },
            data: fileContent,
            retries: 3
        });

        if (!contentResponse.data) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Failed to upload file content to Google Drive'
            });
        }

        const file = contentResponse.data;

        return {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink ?? undefined,
            webContentLink: file.webContentLink ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
