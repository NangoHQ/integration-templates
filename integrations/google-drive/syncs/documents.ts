import type { NangoSync, Document, ProxyConfiguration } from '../../models';
import type { GoogleDriveFileResponse, Metadata } from '../types';

/**
 * Fetches and processes documents from Google Drive, including:
 * - My Drive
 * - Shared With Me files
 * - Shared Drives (including recursive folder traversal)
 * Saves metadata in batches.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<Metadata>();

    if (!metadata || (!metadata.files && !metadata.folders)) {
        throw new Error('Metadata for files or folders is required.');
    }

    const batchSize = 100;
    let batch: Document[] = [];
    const processedFolders = new Set<string>(); // Track processed folders to prevent infinite recursion

    /**
     * Defines the fields to fetch for each file request.
     */
    const fetchFields = 'files(id, name, mimeType, webViewLink, parents, modifiedTime), nextPageToken';

    /**
     * Recursively processes a folder and fetches its files.
     */
    async function processFolder(folderId: string) {
        if (processedFolders.has(folderId)) return; // Prevent infinite recursion
        processedFolders.add(folderId);

        const query = `('${folderId}' in parents) and trashed = false`;
        await fetchFiles(query, true); // Mark as recursive call
    }

    /**
     * Fetches and processes files based on a query.
     *
     * @param query - The Google Drive query to fetch files.
     * @param isRecursive - If true, prevents infinite loops when fetching subfolders.
     */
    async function fetchFiles(query: string, isRecursive = false) {
        const proxyConfiguration: ProxyConfiguration = {
            // https://developers.google.com/drive/api/reference/rest/v3/files/list
            endpoint: 'drive/v3/files',
            params: {
                fields: fetchFields,
                pageSize: batchSize.toString(),
                supportsAllDrives: 'true',
                includeItemsFromAllDrives: 'true',
                corpora: 'allDrives',
                q: query
            },
            paginate: {
                response_path: 'files'
            },
            retries: 10
        };

        for await (const files of nango.paginate<GoogleDriveFileResponse>(proxyConfiguration)) {
            for (const file of files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    if (isRecursive) {
                        await processFolder(file.id); // Only process folders in recursive calls
                    }
                } else {
                    batch.push({
                        id: file.id,
                        url: file.webViewLink,
                        mimeType: file.mimeType,
                        title: file.name,
                        updatedAt: file.modifiedTime
                    });

                    if (batch.length === batchSize) {
                        await nango.batchSave<Document>(batch, 'Document');
                        batch = [];
                    }
                }
            }
        }
    }

    await fetchFiles("'root' in parents and trashed = false");

    await fetchFiles('sharedWithMe = true and trashed = false');

    const sharedDrivesConfig: ProxyConfiguration = {
        // https://developers.google.com/drive/api/reference/rest/v3/drives/list
        endpoint: 'drive/v3/drives',
        params: {
            fields: 'drives(id, name)',
            supportsAllDrives: 'true'
        },
        retries: 10
    };

    const sharedDrivesResponse = await nango.get<{ drives: { id: string; name: string }[] }>(sharedDrivesConfig);
    const sharedDrives = sharedDrivesResponse.data.drives || [];

    for (const drive of sharedDrives) {
        await fetchFiles(`'${drive.id}' in owners and trashed = false`);
    }

    for (const folderId of metadata.folders || []) {
        await processFolder(folderId);
    }

    for (const file of metadata.files || []) {
        // @allowTryCatch
        try {
            const config: ProxyConfiguration = {
                // https://developers.google.com/drive/api/reference/rest/v3/files/get
                endpoint: `drive/v3/files/${file}`,
                params: {
                    fields: fetchFields,
                    supportsAllDrives: 'true'
                },
                retries: 10
            };

            const documentResponse = await nango.get<GoogleDriveFileResponse>(config);
            const { data } = documentResponse;

            batch.push({
                id: data.id,
                url: data.webViewLink,
                mimeType: data.mimeType,
                title: data.name,
                updatedAt: data.modifiedTime
            });

            if (batch.length === batchSize) {
                await nango.batchSave<Document>(batch, 'Document');
                batch = [];
            }
        } catch (e: any) {
            await nango.log(`Error fetching file ${file}: ${e}`, { level: 'error' });
        }
    }

    if (batch.length > 0) {
        await nango.batchSave<Document>(batch, 'Document');
    }
}
