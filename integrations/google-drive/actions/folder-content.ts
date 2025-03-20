import type { NangoAction, ProxyConfiguration } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';

/**
 * Fetches the top-level content (files and folders) of a Google Drive folder.
 * If a folder ID is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {object} input - Optional parameters including id (folder ID) and pageToken (pagination token).
 * @returns {Promise<object>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(
    nango: NangoAction,
    input: { id?: string; pageToken?: string } = {}
): Promise<{
    files: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string;
        createdTime?: string;
        webViewLink?: string;
    }[];
    folders: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string;
        createdTime?: string;
        webViewLink?: string;
    }[];
    nextPageToken?: string;
}> {
    const parsedInput = folderContentInputSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch folder content: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch folder content'
        });
    }

    // Build the query to get both files and folders
    let query = '';

    if (input.id) {
        query = `'${input.id}' in parents`;
    } else {
        query = "'root' in parents";
    }

    const config: ProxyConfiguration = {
        // https://developers.google.com/drive/api/reference/rest/v3/files/list
        endpoint: 'drive/v3/files',
        params: {
            q: query,
            fields: 'files(id,name,mimeType,createdTime,modifiedTime,parents,webViewLink),nextPageToken',
            pageSize: 100,
            pageToken: input.pageToken || '',
            supportsAllDrives: 'true', // Whether the requesting application supports both My Drives and shared drives
            includeItemsFromAllDrives: 'true', // both My Drive and shared drive items
            orderBy: 'name'
        },
        retries: 10
    };

    const response = await nango.get(config);

    if (response.status !== 200) {
        throw new nango.ActionError({
            message: `Failed to fetch folder content: Status Code ${response.status}`
        });
    }

    const items = response.data.files || [];

    // Separate files and folders
    const folders = [];
    const files = [];

    for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
            folders.push(item);
        } else {
            files.push(item);
        }
    }

    return {
        folders,
        files,
        nextPageToken: response.data.nextPageToken
    };
}
