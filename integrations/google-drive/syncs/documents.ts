import { createSync } from 'nango';
import type { GoogleDriveFileResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Document, DocumentMetadata } from '../models.js';

/**
 * Fetches and processes documents from Google Drive, saving their metadata in batches.
 * For detailed endpoint documentation, refer to:
 *
 * https://developers.google.com/drive/api/reference/rest/v3/files/get
 * @param nango - An instance of NangoSync used for API interactions and metadata management.
 * @returns A promise that resolves when all documents are fetched and saved.
 * @throws Error if metadata is missing or if there is an issue during the fetching or saving of documents.
 */
const sync = createSync({
    description:
        'Sync the metadata of a specified file or folders from Google Drive,\nhandling both individual files and nested folders.\nMetadata required to filter on a particular folder, or file(s). Metadata\nfields should be `{"files": ["<some-id>"]}` OR\n`{"folders": ["<some-id>"]}`. The ID should be able to be provided\nby using the Google Picker API\n(https://developers.google.com/drive/picker/guides/overview)\nand using the ID field provided by the response\n(https://developers.google.com/drive/picker/reference/results)',
    version: '4.0.0',
    frequency: 'every day',
    autoStart: false,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/documents',
            group: 'Documents'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    models: {
        Document: Document
    },

    metadata: DocumentMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata || (!metadata.files && !metadata.folders)) {
            throw new Error('Metadata for files or folders is required.');
        }

        // Initialize folders to process and a set to keep track of processed folders
        const initialFolders = metadata?.folders ? [...metadata.folders] : [];
        const processedFolders = new Set<string>();
        const batchSize = 100;
        let batch: Document[] = [];

        /**
         * Processes a folder by fetching and processing its files.
         *
         * @param folderId - The ID of the folder to process.
         */
        async function processFolder(folderId: string) {
            if (processedFolders.has(folderId)) return;
            processedFolders.add(folderId);

            // Query to fetch files in the current folder
            const query = `('${folderId}' in parents) and trashed = false`;
            const proxyConfiguration: ProxyConfiguration = {
                // https://developers.google.com/drive/api/reference/rest/v3/files/get
                endpoint: `drive/v3/files`,
                params: {
                    fields: 'files(id, name, mimeType, webViewLink, parents, modifiedTime), nextPageToken',
                    pageSize: batchSize.toString(),
                    corpora: 'allDrives',
                    includeItemsFromAllDrives: 'true',
                    supportsAllDrives: 'true',
                    q: query
                },
                paginate: {
                    response_path: 'files'
                },
                retries: 10
            };

            // Fetch and process files from the folder
            for await (const files of nango.paginate<GoogleDriveFileResponse>(proxyConfiguration)) {
                for (const file of files) {
                    if (file.mimeType === 'application/vnd.google-apps.folder') {
                        await processFolder(file.id); // Recursively process subfolders
                    } else {
                        batch.push({
                            id: file.id,
                            url: file.webViewLink,
                            mimeType: file.mimeType,
                            title: file.name,
                            updatedAt: file.modifiedTime
                        });

                        if (batch.length === batchSize) {
                            await nango.batchSave(batch, 'Document');
                            batch = []; // Clear batch after saving
                        }
                    }
                }
            }
        }

        // Start processing initial folders
        for (const folderId of initialFolders) {
            await processFolder(folderId);
        }

        // Process individual files specified in metadata
        if (metadata?.files) {
            for (const file of metadata.files) {
                // @allowTryCatch
                try {
                    const config: ProxyConfiguration = {
                        // https://developers.google.com/drive/api/reference/rest/v3/files/get
                        endpoint: `drive/v3/files/${file}`,
                        params: {
                            // https://developers.google.com/drive/api/reference/rest/v3/files#File
                            fields: 'id, name, mimeType, webViewLink, parents, modifiedTime',
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
                        await nango.batchSave(batch, 'Document');
                        batch = [];
                    }
                } catch (e: any) {
                    await nango.log(`Error fetching file ${file}: ${e}`, { level: 'error' });
                }
            }
        }

        if (batch.length > 0) {
            await nango.batchSave(batch, 'Document');
        }
        await nango.deleteRecordsFromPreviousExecutions('Document');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
