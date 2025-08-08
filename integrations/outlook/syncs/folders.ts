import { createSync } from 'nango';
import type { OutlookFolderResponse } from '../types.js';

import { OutlookFolder } from '../models.js';
import { z } from 'zod';

/**
 * Fetches all Outlook mail folders and their children
 * @param nango - NangoSync instance
 * @returns A Map of folder IDs to folder objects
 */
const sync = createSync({
    description: 'Fetches a list of folders from outlook.',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/folders'
        }
    ],

    scopes: ['Mail.Read'],

    models: {
        OutlookFolder: OutlookFolder
    },

    metadata: z.object({}),

    exec: async (nango) => {
        await nango.log('Fetching Outlook folders', { level: 'debug' });

        const folders: OutlookFolder[] = [];
        const foldersResponse = await nango.proxy({
            method: 'get',
            endpoint: '/v1.0/me/mailFolders',
            params: {
                $select: 'id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
                $top: 100, // Sets the page size of results.
                includeHiddenFolders: 'true' // Include hidden
            },
            retries: 10
        });

        folders.push(...foldersResponse.data.value);

        // Get child folders
        await fetchChildFolders(nango, folders);

        const mappedFolders: OutlookFolder[] = folders.map((folder: OutlookFolderResponse) => {
            return {
                id: folder.id,
                displayName: folder.displayName,
                parentFolderId: folder.parentFolderId,
                childFolderCount: folder.childFolderCount || 0,
                totalItemCount: folder.totalItemCount || 0,
                unreadItemCount: folder.unreadItemCount || 0,
                isHidden: folder.isHidden || false
            };
        });
        await nango.log(`Fetched ${mappedFolders.length} Outlook folders`, { level: 'info' });
        await nango.batchSave(mappedFolders, 'OutlookFolder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

/**
 * Recursively fetches child folders for any folder with childFolderCount > 0
 * @param nango - NangoSync instance
 * @param outlookFolders - Map of folder IDs to folder objects to be updated
 */
async function fetchChildFolders(nango: NangoSyncLocal, outlookFolders: OutlookFolder[]): Promise<void> {
    await nango.log('Fetching child folders', { level: 'debug' });
    const foldersWithChildren = outlookFolders.filter((folder) => folder.childFolderCount > 0);

    for (const parentFolder of foldersWithChildren) {
        const childFoldersResponse = await nango.proxy({
            method: 'get',
            endpoint: `/v1.0/me/mailFolders/${parentFolder.id}/childFolders`,
            params: {
                $select: 'id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount',
                includeHiddenFolders: 'true'
            },
            retries: 10
        });

        const childFolders = childFoldersResponse.data.value || [];

        // Recursively fetch child folders for the new folders
        if (childFolders.length > 0) {
            outlookFolders.push(...childFolders);
            await fetchChildFolders(nango, childFolders);
        }
    }
}
