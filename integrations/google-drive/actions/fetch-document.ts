import type { NangoAction, ProxyConfiguration, IdEntity } from '../../models';
import type { GoogleDriveFileResponse } from '../types.js';
import { mimeTypeMapping } from '../types.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Retrieves and returns the content of a Google Drive file as a base64-encoded string.
 *
 * For detailed endpoint documentation, refer to:
 *
 * https://developers.google.com/drive/api/reference/rest/v3/files/get
 * https://developers.google.com/drive/api/reference/rest/v3/files/export
 * @param nango - An instance of NangoAction used for making API requests.
 * @param input - The ID of the file to be retrieved, provided as a string.
 * @returns The base64-encoded content of the file.
 * @throws Error if the input is invalid, or if the file metadata or content retrieval fails.
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<string> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'The input must be an object with an "id" property.'
        });
    }

    // Fetch the file metadata first to get the MIME type
    const Config: ProxyConfiguration = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/get
        endpoint: `drive/v3/files/${input.id}`,
        params: {
            fields: 'id, name, mimeType, size',
            supportsAllDrives: 'true'
        },
        retries: 3
    };
    const fileMetadataResponse = await nango.get<GoogleDriveFileResponse>(Config);

    if (fileMetadataResponse.status !== 200 || !fileMetadataResponse.data) {
        throw new Error(`Failed to retrieve file metadata: Status Code ${fileMetadataResponse.status}`);
    }

    const file = fileMetadataResponse.data;
    const mimeTypeDetails = mimeTypeMapping[file.mimeType];

    if (file.size && parseInt(file.size) > MAX_FILE_SIZE) {
        await nango.log('WARNING', {
            message: `File size exceeds the 10MB limit`,
            fileSize: file.size,
            fileName: file.name
        });
        throw new nango.ActionError({
            message: 'File too large',
            details: `The file "${file.name}" is ${(parseInt(file.size) / (1024 * 1024)).toFixed(2)}MB, which exceeds the 10MB limit allowed by Nango.`
        });
    }

    if (!mimeTypeDetails) {
        throw new Error(`Unsupported MIME type: ${file.mimeType}`);
    }

    const { mimeType: exportMimeType, responseType } = mimeTypeDetails;

    await nango.log('Fetching document of ', { exportMimeType });
    await nango.log('Fetching document of ', { responseType });

    const endpoint = responseType === 'text' ? `drive/v3/files/${file.id}/export` : `drive/v3/files/${file.id}`;
    const params = responseType === 'text' ? { mimeType: exportMimeType } : { alt: 'media' };

    const config: ProxyConfiguration = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/get
        // https://developers.google.com/drive/api/reference/rest/v3/files/export
        endpoint,
        params,
        responseType,
        retries: 3
    };
    const response = await nango.get(config);

    if (response.status !== 200) {
        throw new Error(`Failed to retrieve file content: Status Code ${response.status}`);
    }

    if (responseType === 'text') {
        return response.data ?? '';
    } else {
        const chunks: Buffer[] = [];
        for await (const chunk of response.data) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return buffer.toString('base64');
    }
}
