import { Nango } from '@nangohq/node';
import type { GoogleDriveFileResponse } from '../types.js';
import { mimeTypeMapping } from '../types.js';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Retrieves and returns the content of a Google Drive file as a base64-encoded string.
 *
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 * https://developers.google.com/drive/api/reference/rest/v3/files/get
 * https://developers.google.com/drive/api/reference/rest/v3/files/export
 */
async function run(input: { id: string }): Promise<string> {
    // Fetch the file metadata first to get the MIME type
    const config = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/get
        endpoint: `drive/v3/files/${input.id}`,
        params: {
            fields: 'id, name, mimeType, size',
            supportsAllDrives: 'true'
        },
        retries: 3
    };
    const fileMetadataResponse = await nango.get<GoogleDriveFileResponse>(config);

    if (fileMetadataResponse.status !== 200 || !fileMetadataResponse.data) {
        throw new Error(`Failed to retrieve file metadata: Status Code ${fileMetadataResponse.status}`);
    }

    const file = fileMetadataResponse.data;
    const mimeTypeDetails = mimeTypeMapping[file.mimeType];

    if (!mimeTypeDetails) {
        throw new Error(`Unsupported MIME type: ${file.mimeType}`);
    }

    const { mimeType: exportMimeType, responseType } = mimeTypeDetails;

    const endpoint = responseType === 'text' ? `drive/v3/files/${file.id}/export` : `drive/v3/files/${file.id}`;
    const params = responseType === 'text' ? { mimeType: exportMimeType } : { alt: 'media' };

    const fetchConfig = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/get
        // https://developers.google.com/drive/api/reference/rest/v3/files/export
        endpoint,
        params,
        responseType,
        retries: 3
    };
    const response = await nango.get(fetchConfig);

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

const documentId = { id: 'your-document-id' }; // Replace with your actual document ID

await run(documentId);
