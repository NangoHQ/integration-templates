import type { NangoAction, ProxyConfiguration } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';
import type { DropboxFileList } from '../types';

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
export default async function runAction(
    nango: NangoAction,
    input: { path?: string; cursor?: string } = {}
): Promise<{
    files: { id: string; path: string; title: string; modified_date: string }[];
    folders: { id: string; path: string; title: string; modified_date: string }[];
    cursor?: string;
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
            limit: 100
        },
        retries: 10
    };

    // If cursor is provided, use the continue endpoint instead
    const response = await nango.post<DropboxFileList>(
        input.cursor
            ? {
                  // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
                  endpoint: `/2/files/list_folder/continue`,
                  data: { cursor: input.cursor },
                  retries: 10
              }
            : config
    );

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

    return {
        folders,
        files,
        cursor: response.data.cursor
    };
}
