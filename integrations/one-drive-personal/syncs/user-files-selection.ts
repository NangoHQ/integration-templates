import { createSync } from 'nango';
import type { DriveItem } from '../types.js';
import { toFile } from '../mappers/to-file.js';
import type { ProxyConfiguration } from 'nango';
import { OneDriveFileSelection, OneDriveMetadata } from '../models.js';

const sync = createSync({
    description: "Fetch selected files and folders from a user's OneDrive personal account based on provided metadata.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/user-files/selected',
            group: 'Files'
        }
    ],

    scopes: ['OneDrive.ReadWrite', 'offline_access'],

    models: {
        OneDriveFileSelection: OneDriveFileSelection
    },

    metadata: OneDriveMetadata,

    exec: async (nango) => {
        // Personal accounts have a single root drive.
        const metadata = await nango.getMetadata<OneDriveMetadata>();
        const fileIds = metadata?.fileIds || [];

        if (fileIds.length === 0) {
            await nango.log('No fileIds provided in metadata');
            return;
        }

        const files: OneDriveFileSelection[] = [];
        const BATCH_SIZE = 100;

        for (const fileId of fileIds) {
            const itemConfig: ProxyConfiguration = {
                //  https://learn.microsoft.com/en-us/graph/api/driveitem-get
                endpoint: `/v1.0/drive/items/${fileId}`,
                retries: 10
            };

            try {
                const response = await nango.get<DriveItem>(itemConfig);
                const item = response.data;

                files.push(toFile(item, 'root'));

                if (item.folder && item.folder.childCount > 0) {
                    await fetchFolderContents(nango, fileId, files);
                }

                if (files.length >= BATCH_SIZE) {
                    await nango.batchSave(files, 'OneDriveFileSelection');
                    files.length = 0;
                }
            } catch (error: any) {
                await nango.log(`Error fetching file or folder ${fileId}: ${error}`);
            }
        }

        if (files.length > 0) {
            await nango.batchSave(files, 'OneDriveFileSelection');
        }
        await nango.deleteRecordsFromPreviousExecutions("OneDriveFileSelection");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchFolderContents(
    nango: NangoSyncLocal,
    folderId: string,
    files: OneDriveFileSelection[],
    depth = 3
) {
    if (depth === 0) return;

    const folderConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children
        endpoint: `/v1.0/drive/items/${folderId}/children`,
        paginate: {
            type: 'link',
            limit_name_in_request: '$top',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: 100
        },
        retries: 10
    };

    for await (const items of nango.paginate(folderConfig)) {
        for (const item of items) {
            files.push(toFile(item, 'root'));

            if (item.folder && item.folder.childCount > 0) {
                await fetchFolderContents(nango, item.id, files, depth - 1);
            }
        }
    }
}
