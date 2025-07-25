import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { DriveItem } from '../types.js';
import { toFile } from '../mappers/to-file.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<{
        drives?: string[];
        pickedFiles: {
            driveId: string;
            fileIds: string[];
        }[];
    }>();

    if (!metadata || !metadata.pickedFiles || !metadata.pickedFiles.length) {
        await nango.log('No files selected for syncing');
        return;
    }

    const files = [];

    for (const pickedFile of metadata.pickedFiles) {
        const { driveId, fileIds } = pickedFile;

        for (const fileId of fileIds) {
            // Get the file or folder
            // https://learn.microsoft.com/en-us/graph/api/driveitem-get?view=graph-rest-1.0
            const itemConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/driveitem-get?view=graph-rest-1.0
                endpoint: `/v1.0/drives/${driveId}/items/${fileId}`,
                retries: 10
            };

            // @allowTryCatch
            try {
                const response = await nango.get<DriveItem>(itemConfig);
                const item = response.data;

                // Add the file to the list
                files.push(toFile(item, driveId));

                // If it's a folder, fetch its contents recursively
                if (item.folder && item.folder.childCount > 0) {
                    await fetchFolderContents(nango, driveId, fileId, files);
                }
            } catch (error: any) {
                await nango.log(`Error fetching file ${fileId} from drive ${driveId}: ${error.message}`);
            }
        }
    }

    await nango.batchSave(files, 'OneDriveFileSelection');
}

async function fetchFolderContents(nango: NangoSync, driveId: string, folderId: string, files: any[], depth = 3) {
    if (depth === 0) {
        return;
    }

    // Get items in the folder
    // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
    const folderConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
        endpoint: `/v1.0/drives/${driveId}/items/${folderId}/children`,
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
            // Add the file to the list
            files.push(toFile(item, driveId));

            // If it's a folder, fetch its contents recursively
            if (item.folder && item.folder.childCount > 0) {
                await fetchFolderContents(nango, driveId, item.id, files, depth - 1);
            }
        }
    }
}
