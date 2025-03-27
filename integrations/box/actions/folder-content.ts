import type { NangoAction, FolderContentInput, FolderContent, ProxyConfiguration } from '../../models';

/**
 * Fetches the top-level content (files and folders) of a Box folder.
 * If a folder ID is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder (ID "0").
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {object} input - Optional parameters including id (folder ID) and marker (pagination cursor).
 * @returns {Promise<object>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(nango: NangoAction, input: FolderContentInput): Promise<FolderContent> {
    // Use folder ID if provided, otherwise use root folder (ID "0")
    const folderId = input.id || '0';

    const config: ProxyConfiguration = {
        // https://developer.box.com/reference/get-folders-id-items/
        endpoint: `/2.0/folders/${folderId}/items`,
        params: {
            userMarker: 'true',
            fields: 'id,name,modified_at,shared_link',
            marker: input.marker || '',
            useMarker: 'true',
            limit: 100
        },
        retries: 3
    };

    const response = await nango.get(config);

    if (response.status !== 200) {
        throw new nango.ActionError({
            message: `Failed to fetch folder content: Status Code ${response.status}`
        });
    }

    const items = response.data.entries || [];

    // Separate files and folders
    const folders: { id: string; name: string; modified_at: string; url: string | null }[] = [];
    const files: { id: string; name: string; download_url: string; modified_at: string }[] = [];

    for (const item of items) {
        if (item.type === 'folder') {
            folders.push({
                id: item.id,
                name: item.name,
                modified_at: item.modified_at,
                url: item.shared_link?.download_url || null
            });
        } else if (item.type === 'file') {
            files.push({
                id: item.id,
                name: item.name,
                modified_at: item.modified_at,
                download_url: item.shared_link?.download_url || ''
            });
        }
    }

    return {
        folders,
        files,
        next_marker: response.data.next_marker
    };
}
