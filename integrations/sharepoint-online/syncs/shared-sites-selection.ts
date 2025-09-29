import { createSync } from 'nango';
import type { DriveItem } from '../types.js';
import { toFile } from '../mappers/to-file.js';

import type { ProxyConfiguration } from 'nango';
import { FileMetadata, SharepointMetadata } from '../models.js';

/**
 * Fetches data from SharePoint sites and processes list items for synchronization.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @returns Promise<void>
 */
const sync = createSync({
    description: 'This sync will be used to sync file metadata from SharePoint site based on the ones the user has picked.',
    version: '3.0.0',
    frequency: 'every 1 hour',
    autoStart: false,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/shared-files/selected'
        }
    ],

    scopes: ['Sites.Read.All', 'Sites.Selected', 'MyFiles.Read', 'Files.Read.All', 'Files.Read.Selected', 'offline_access'],

    models: {
        FileMetadata: FileMetadata
    },

    metadata: SharepointMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata || !Array.isArray(metadata.sharedSites) || metadata.sharedSites.length === 0) {
            throw new Error(`Metadata empty for connection id: ${nango.connectionId}`);
        }

        const siteIdToLists = await getSiteIdToLists(nango, metadata.sharedSites);

        for (const [siteId, listIds] of Object.entries(siteIdToLists)) {
            for (const listId of listIds) {
                await processListItems(nango, siteId, listId);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

/**
 * Retrieves site IDs and associated document libraries to sync from SharePoint.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param sitesToSync An array of Site objects representing SharePoint sites.
 * @returns Promise<Record<string, string[]>>
 */
async function getSiteIdToLists(nango: NangoSyncLocal, files: string[]): Promise<Record<string, string[]>> {
    const siteIdToLists: Record<string, string[]> = {};

    for (const siteId of files) {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/list-list?view=graph-rest-1.0&tabs=http
            endpoint: `v1.0/sites/${siteId}/lists`,
            paginate: {
                type: 'link',
                limit_name_in_request: '$top',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: 100
            },
            retries: 10
        };
        // Paginate through lists and filter documentlibraries
        for await (const lists of nango.paginate(config)) {
            siteIdToLists[siteId] = lists.filter((list: any) => list.list.template === 'documentLibrary').map((l: any) => l.id);
        }
    }

    return siteIdToLists;
}

/**
 * Processes list items for synchronization from a SharePoint list.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param siteId The ID of the SharePoint site containing the list.
 * @param listId The ID of the SharePoint list containing items to sync.
 * @returns Promise<void>
 */
async function processListItems(nango: NangoSyncLocal, siteId: string, listId: string): Promise<void> {
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/listitem-delta?view=graph-rest-1.0&tabs=http
        endpoint: `/v1.0/sites/${siteId}/lists/${listId}/items/delta`,
        paginate: {
            type: 'link',
            limit_name_in_request: '$top',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: 100
        },
        // Include '$filter' parameter with the lastSyncDate if available
        ...(nango.lastSyncDate ? { params: { $filter: `lastModifiedDateTime ge ${nango.lastSyncDate.toISOString()}` } } : {}),
        retries: 10
    };

    // Paginate through list items and sync each file metadata
    for await (const listItems of nango.paginate(config)) {
        const allMetadata = [];
        for (const item of listItems) {
            const metadata = await fetchDriveItemDetails(nango, siteId, listId, item.id);
            allMetadata.push(metadata);
        }
        await nango.batchSave(allMetadata, 'FileMetadata');
    }
}

/**
 * Fetches details of a drive item (file) from SharePoint.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param siteId The ID of the SharePoint site containing the list.
 * @param listId The ID of the SharePoint list containing the item.
 * @param itemId The ID of the drive item (file) to fetch details for.
 * @returns Promise<FileMetadata>
 */
async function fetchDriveItemDetails(nango: NangoSyncLocal, siteId: string, listId: string, itemId: string): Promise<FileMetadata> {
    const response = await nango.get<DriveItem>({
        // https://learn.microsoft.com/en-us/graph/api/driveitem-get?view=graph-rest-1.0&tabs=http
        endpoint: `/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem`,
        retries: 10
    });

    return toFile(response.data, siteId);
}
