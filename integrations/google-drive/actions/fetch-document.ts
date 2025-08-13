import { createAction } from 'nango';
import type { GoogleDriveFileResponse } from '../types.js';
import { mimeTypeMapping } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Anonymous_googledrive_action_fetchdocument_output, IdEntity } from '../models.js';

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
const action = createAction({
    description:
        'Fetches the content of a file given its ID, processes the data using\na response stream, and encodes it into a base64 string. This base64-encoded\nstring can be used to recreate the file in its original format using an external tool.\nIf this is a native google file type then use the fetch-google-sheet or fetch-google-doc\nactions.',
    version: '3.0.0',

    endpoint: {
        method: 'GET',
        path: '/fetch-document',
        group: 'Documents'
    },

    input: IdEntity,
    output: Anonymous_googledrive_action_fetchdocument_output,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<Anonymous_googledrive_action_fetchdocument_output> => {
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

            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            return Buffer.concat(chunks as unknown as Uint8Array[]).toString('base64');
        }
    }
}); // 10MB in bytes

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
