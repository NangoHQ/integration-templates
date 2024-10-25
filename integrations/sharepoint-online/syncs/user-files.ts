import type { NangoSync, UserFileMetadata, ProxyConfiguration } from '../../models';
import type { DriveResponse, DriveItemFromItemResponse, ItemResponse } from '../types';
import { toFile } from '../mappers/to-file.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const driveConfiguration: ProxyConfiguration = {
        endpoint: '/v1.0/me/drives',
        retries: 10
    };

    const driveResponse = await nango.get<DriveResponse>(driveConfiguration);
    const { value: drives } = driveResponse.data;

    const files: UserFileMetadata[] = [];

    for (const drive of drives) {
        const { id } = drive;

        const itemsConfiguration: ProxyConfiguration = {
            endpoint: `/v1.0/drives/${id}/root/children`,
            retries: 10
        };

        const itemResponse = await nango.get<ItemResponse>(itemsConfiguration);
        const { value: items } = itemResponse.data;

        for (const item of items) {
            await fetchFilesRecursive(nango, id, item, files);
        }
    }

    await nango.batchSave(files, 'UserFileMetadata');
}

async function fetchFilesRecursive(nango: NangoSync, driveId: string, item: DriveItemFromItemResponse, files: UserFileMetadata[], depth = 3) {
    if (depth === 0) {
        return;
    }

    if (item.folder && item.folder.childCount > 0) {
        const folderConfig: ProxyConfiguration = {
            endpoint: `/v1.0/drives/${driveId}/items/${item.id}/children`,
            retries: 10
        };

        const folderResponse = await nango.get(folderConfig);
        const { value: items } = folderResponse.data;

        for (const item of items) {
            await fetchFilesRecursive(nango, driveId, item, files, depth - 1);
        }
    } else {
        files.push(toFile(item, item.parentReference.siteId));
    }
}
