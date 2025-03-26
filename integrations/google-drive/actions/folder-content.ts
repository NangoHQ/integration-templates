import type { NangoAction, ProxyConfiguration, FolderContentInput, FolderContent, GoogleDocument } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';

/**
 * Fetches the top-level content (files and folders) of a Google Drive folder.
 * If a folder ID is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {FolderContentInput} input - Optional parameters including id (folder ID) and pageToken (pagination token).
 * @returns {Promise<FolderContent>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(nango: NangoAction, input: FolderContentInput = {}): Promise<FolderContent> {
    await nango.zodValidateInput({ zodSchema: folderContentInputSchema, input });

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
            pageToken: input.cursor || '',
            corpora: 'allDrives',
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
    const folders: GoogleDocument[] = [];
    const files: GoogleDocument[] = [];

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
        ...(response.data.cursor ? { cursor: response.data.nextPageToken } : {})
    };
}
