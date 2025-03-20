import type { NangoAction, ProxyConfiguration } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';

/**
 * Fetches the top-level content (files and folders) of a Google Drive folder.
 * If a folderId is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {object} input - Optional parameters including folderId and nextPageToken for pagination.
 * @returns {Promise<object>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(nango: NangoAction, input: any = {}): Promise<any> {
    await nango.zodValidateInput({ zodSchema: folderContentInputSchema, input });

    // Use 'root' for root folder if no folderId is provided
    const folderId = input.folderId || 'root';
    const pageToken = input.nextPageToken || '';

    const config: ProxyConfiguration = {
        // https://developers.google.com/drive/api/v3/reference/files/list
        endpoint: `/drive/v3/files`,
        params: {
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime),nextPageToken',
            pageSize: 100,
            ...(pageToken ? { pageToken } : {})
        },
        retries: 10
    };

    const response = await nango.get(config);

    if (response.status !== 200) {
        throw new nango.ActionError({
            message: `Failed to fetch folder content: Status Code ${response.status}`
        });
    }

    const files = response.data.files || [];

    // Separate files and folders
    const folders = [];
    const filesList = [];

    for (const item of files) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
            folders.push(item);
        } else {
            filesList.push(item);
        }
    }

    // Return the folder content with pagination info
    return {
        folders,
        files: filesList,
        ...(response.data.nextPageToken ? { nextPageToken: response.data.nextPageToken } : {})
    };
}
