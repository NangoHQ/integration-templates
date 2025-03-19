import type { NangoAction, ProxyConfiguration, FolderContentInput, FolderContent } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';

/**
 * Fetches the top-level content (files and folders) of a Dropbox folder.
 * If a path is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {object} input - Optional parameters including path (folder path) and cursor (pagination cursor).
 * @returns {Promise<object>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(nango: NangoAction, input: FolderContentInput = {}): Promise<FolderContent> {
    await nango.zodValidateInput({ zodSchema: folderContentInputSchema, input });

    // Use empty string for root folder if no path is provided
    const path = input.path || '';

    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
        endpoint: `/2/files/list_folder`,
        data: {
            path,
            recursive: false,
            include_mounted_folders: true,
            include_non_downloadable_files: true,
            limit: 100 // Using a more reasonable default limit
        },
        retries: 10
    };

    // Define a separate config for the continue endpoint
    const continueConfig: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
        endpoint: `/2/files/list_folder/continue`,
        data: { cursor: input.cursor },
        retries: 10
    };

    /* eslint-disable @nangohq/custom-integrations-linting/proxy-call-retries */
    const response = await nango.post(input.cursor ? continueConfig : config);

    if (response.status !== 200) {
        throw new nango.ActionError({
            message: `Failed to fetch folder content: Status Code ${response.status}`
        });
    }

    const entries = response.data.entries || [];

    // Separate files and folders
    const folders: { id: string; path: string; title: string; modified_date: string }[] = [];
    const files: { id: string; path: string; title: string; modified_date: string }[] = [];

    for (const entry of entries) {
        if (entry['.tag'] === 'folder') {
            folders.push({
                id: entry.id || entry.path_lower,
                path: entry.path_lower,
                title: entry.name,
                modified_date: entry.server_modified || ''
            });
        } else if (entry['.tag'] === 'file') {
            files.push({
                id: entry.id || entry.path_lower,
                path: entry.path_lower,
                title: entry.name,
                modified_date: entry.client_modified || ''
            });
        }
    }

    // Only return cursor if there are more items to fetch
    return {
        folders,
        files,
        ...(response.data.has_more ? { cursor: response.data.cursor } : {})
    };
}
