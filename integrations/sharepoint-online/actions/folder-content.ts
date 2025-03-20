import type { NangoAction, ProxyConfiguration } from '../../models';
import type { ItemResponse } from '../types';
import { folderContentInputSchema } from '../schema.zod.js';
import { toFile } from '../mappers/to-file.js';

/**
 * Fetches the top-level content (files and folders) of a SharePoint folder.
 * If a folder ID is provided, it fetches content from that folder.
 * Otherwise, it fetches content from the root folder.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {object} input - Optional parameters including siteId, itemId, and nextLink (pagination).
 * @returns {Promise<object>} - A promise that resolves to the folder content with files, folders, and pagination info.
 * @throws {Error} - Throws an error if the API request fails.
 */
export default async function runAction(
    nango: NangoAction,
    input: { siteId?: string; itemId?: string; nextLink?: string } = {}
): Promise<{
    files: any[];
    folders: any[];
    nextLink?: string;
}> {
    await nango.zodValidateInput({ zodSchema: folderContentInputSchema, input });

    // If nextLink is provided, use it directly for pagination
    if (input.nextLink) {
        return await fetchWithNextLink(nango, input.nextLink);
    }

    // Determine the endpoint based on input parameters
    let endpoint: string;

    if (input.siteId && input.itemId) {
        // Fetch specific folder in a site
        endpoint = `/v1.0/sites/${input.siteId}/drive/items/${input.itemId}/children`;
    } else if (input.siteId) {
        // Fetch root folder of a site
        endpoint = `/v1.0/sites/${input.siteId}/drive/root/children`;
    } else {
        // Fetch current user's drive root
        endpoint = '/v1.0/me/drives';
    }

    if (endpoint === '/v1.0/me/drives') {
        // First get the user's drives
        // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
        const drivesConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
            endpoint,
            retries: 10
        };

        const drivesResponse = await nango.get(drivesConfig);

        if (!drivesResponse.data.value || drivesResponse.data.value.length === 0) {
            return { files: [], folders: [] };
        }

        // Use the first drive to get root items
        const driveId = drivesResponse.data.value[0].id;
        endpoint = `/v1.0/drives/${driveId}/root/children`;
    }

    // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
        endpoint,
        params: {
            $top: 100,
            $select: 'id,name,size,file,folder,parentReference,webUrl,createdDateTime,lastModifiedDateTime,@microsoft.graph.downloadUrl'
        },
        retries: 10
    };

    const response = await nango.get<ItemResponse>(config);

    return processResponse(response.data, input.siteId);
}

/**
 * Fetches folder content using a nextLink URL for pagination.
 *
 * @param {NangoAction} nango - The Nango action instance.
 * @param {string} nextLink - The URL for the next page of results.
 * @returns {Promise<object>} - A promise that resolves to the folder content.
 */
async function fetchWithNextLink(
    nango: NangoAction,
    nextLink: string
): Promise<{
    files: any[];
    folders: any[];
    nextLink?: string;
}> {
    // https://learn.microsoft.com/en-us/graph/paging
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/paging
        baseUrlOverride: nextLink,
        // https://learn.microsoft.com/en-us/graph/paging
        endpoint: '',
        retries: 10
    };

    const response = await nango.get<ItemResponse>(config);

    // Extract siteId from the first item if available
    const siteId =
        response.data.value && response.data.value.length > 0 && response.data.value[0] && response.data.value[0].parentReference
            ? response.data.value[0].parentReference.siteId
            : undefined;

    return processResponse(response.data, siteId);
}

/**
 * Processes the API response and separates files and folders.
 *
 * @param {NangoAction} nango - The Nango action instance.
 * @param {ItemResponse} data - The response data from the API.
 * @param {string} siteId - The site ID.
 * @returns {object} - An object containing files, folders, and pagination info.
 */
function processResponse(
    data: ItemResponse,
    siteId?: string
): {
    files: any[];
    folders: any[];
    nextLink?: string;
} {
    const items = data.value || [];

    // Separate files and folders
    const folders: any[] = [];
    const files: any[] = [];

    for (const item of items) {
        // Use the siteId from the item if not provided
        const itemSiteId = siteId || item.parentReference.siteId;

        const fileMetadata = toFile(item, itemSiteId);

        if (item.folder) {
            folders.push(fileMetadata);
        } else if (item.file) {
            files.push(fileMetadata);
        }
    }

    // Return nextLink only if it exists in the response
    const result: { files: any[]; folders: any[]; nextLink?: string } = {
        folders,
        files
    };

    // Check if nextLink exists in the response
    if (data['@odata.nextLink'] !== undefined) {
        result.nextLink = data['@odata.nextLink'];
    }

    return result;
}
