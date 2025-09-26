import { createSync } from 'nango';
import type { GoogleDriveFileResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Folder } from '../models.js';
import { z } from 'zod';

/**
 * Fetches and saves only the folders at the root of Google Drive.
 *
 * The sync queries for items in the root folder that are folders (i.e. have the folder mimeType)
 * and saves them in batches via NangoSync.batchSave.
 *
 * @param nango - An instance of NangoSync used for API interactions.
 */
const sync = createSync({
    description: 'Sync the folders at the root level of a google drive.',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/root-folders',
            group: 'Folders'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    models: {
        Folder: Folder
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const batchSize = 100;
        let batch: Folder[] = [];

        // Query to fetch only folders located in the root folder
        const query = `('root' in parents) and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
        const proxyConfiguration: ProxyConfiguration = {
            // https://developers.google.com/drive/api/reference/rest/v3/files/get
            endpoint: `drive/v3/files`,
            params: {
                fields: 'files(id, name, mimeType, webViewLink, parents, modifiedTime), nextPageToken',
                pageSize: batchSize.toString(),
                q: query,
                corpora: 'allDrives',
                supportsAllDrives: 'true', // Whether the requesting application supports both My Drives and shared drives
                includeItemsFromAllDrives: 'true'
            },
            paginate: {
                response_path: 'files'
            },
            retries: 10
        };

        // Fetch and process each page of root folders
        for await (const folders of nango.paginate<GoogleDriveFileResponse>(proxyConfiguration)) {
            for (const folder of folders) {
                batch.push({
                    id: folder.id,
                    title: folder.name,
                    mimeType: folder.mimeType,
                    url: folder.webViewLink,
                    updatedAt: folder.modifiedTime
                });

                if (batch.length >= batchSize) {
                    await nango.batchSave(batch, 'Folder');
                    batch = [];
                }
            }
        }

        // Save any remaining folders
        if (batch.length > 0) {
            await nango.batchSave(batch, 'Folder');
        }
    await nango.deleteRecordsFromPreviousExecutions("Folder");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
