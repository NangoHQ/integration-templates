import type { GoogleDocument, NangoAction, ProxyConfiguration, UploadFileInput } from '../../models.js';

/**
 * Uploads a file to Google Drive using simple upload.
 * Uploads the file using simple upload then sets metadata if provided.
 *
 * @param nango - An instance of NangoAction.
 * @param input - Object containing file details (content, name, optional mimeType and folderId).
 * @returns Metadata about the uploaded file.
 */
export default async function runAction(nango: NangoAction, input: UploadFileInput): Promise<GoogleDocument> {
    if (!input.content) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'File content is required.'
        });
    }

    if (!input.name) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'File name is required.'
        });
    }

    // Set default MIME type
    const mimeType = input.mimeType || 'application/octet-stream';

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
    try {
        let fileContent: Buffer;
        if (input.isBase64 === true) {
            fileContent = Buffer.from(input.content, 'base64');
        } else {
            fileContent = Buffer.from(input.content);
        }

        const fileSizeInBytes = fileContent.length;
        const maxFileSizeInBytes = 5 * 1024 * 1024; // 5 MB

        if (fileSizeInBytes > maxFileSizeInBytes) {
            throw new nango.ActionError({
                message: 'File size exceeds limit',
                details: 'The file size exceeds the 5 MB limit for simple uploads.'
            });
        }

        const uploadConfig: ProxyConfiguration = {
            // https://developers.google.com/drive/api/reference/rest/v3/files/create
            endpoint: 'upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'media'
            },
            headers: {
                'Content-Type': mimeType,
                'Content-Length': fileContent.length.toString()
            },
            data: fileContent,
            retries: 3
        };

        const uploadResponse = await nango.post<GoogleDocument>(uploadConfig);

        if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
            throw new nango.ActionError(`Failed to upload file: Status ${uploadResponse.status}`);
        }

        const fileId = uploadResponse.data.id;

        // If a name or folder ID is provided, update metadata to move the file to that folder
        if (input.folderId || input.name) {
            const metadata: Record<string, any> = {
                name: input.name
            };

            if (input.description) {
                metadata['description'] = [input.description];
            }

            const updateConfig: ProxyConfiguration = {
                // https://developers.google.com/drive/api/reference/rest/v3/files/update
                endpoint: `drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: {
                    ...(input.folderId ? { addParents: input.folderId, removeParents: 'root' } : {}),
                    supportsAllDrives: 'true'
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                data: metadata,
                retries: 3
            };

            const updateResponse = await nango.patch<GoogleDocument>(updateConfig);

            if (updateResponse.status !== 200) {
                throw new Error(`Failed to update file metadata: Status Code ${updateResponse.status}`);
            }
            return updateResponse.data;
        }

        return uploadResponse.data;
    } catch (error) {
        throw new nango.ActionError({
            message: 'Failed to upload file to Google Drive',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
