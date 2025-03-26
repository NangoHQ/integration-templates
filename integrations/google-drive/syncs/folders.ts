import type { NangoSync, Folder, ProxyConfiguration } from '../../models';
import type { GoogleDriveFileResponse } from '../types';

/**
 * Fetches and saves only the folders at the root of Google Drive.
 *
 * The sync queries for items in the root folder that are folders (i.e. have the folder mimeType)
 * and saves them in batches via NangoSync.batchSave.
 *
 * @param nango - An instance of NangoSync used for API interactions.
 */
export default async function fetchRootFolders(nango: NangoSync): Promise<void> {
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
                await nango.batchSave<Folder>(batch, 'Folder');
                batch = [];
            }
        }
    }

    // Save any remaining folders
    if (batch.length > 0) {
        await nango.batchSave<Folder>(batch, 'Folder');
    }
}
