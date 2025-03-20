import type { NangoSync, ProxyConfiguration } from '@nangohq/nango';
import type { DriveResponse, DriveItem } from '../types.js';
import { toFile } from '../mappers/to-file.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    // Get the user's drives
    // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
    const driveConfiguration: ProxyConfiguration = {
        endpoint: '/v1.0/me/drives',
        retries: 10
    };

    const driveResponse = await nango.get<DriveResponse>(driveConfiguration);
    const { value: drives } = driveResponse.data;

    const files = [];

    for (const drive of drives) {
        const { id } = drive;

        // Get items in the root folder of the drive
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
        const itemsConfiguration: ProxyConfiguration = {
            endpoint: `/v1.0/drives/${id}/root/children`,
            paginate: {
                type: 'link',
                limit_name_in_request: '$top',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: 100
            },
            retries: 10
        };

        for await (const items of nango.paginate(itemsConfiguration)) {
            for (const item of items) {
                await fetchFilesRecursive(nango, id, item, files);
            }
        }
    }

    await nango.batchSave(files, 'FileMetadata');
}

async function fetchFilesRecursive(nango: NangoSync, driveId: string, item: DriveItem, files: any[], depth = 3) {
    if (depth === 0) {
        return;
    }

    files.push(toFile(item, driveId));

    if (item.folder && item.folder.childCount > 0) {
        const folderConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
            endpoint: `/v1.0/drives/${driveId}/items/${item.id}/children`,
            paginate: {
                type: 'link',
                limit_name_in_request: '$top',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: 100
            },
            retries: 10
        };

        for await (const childItems of nango.paginate(folderConfig)) {
            for (const childItem of childItems) {
                await fetchFilesRecursive(nango, driveId, childItem, files, depth - 1);
            }
        }
    }
}
