import type { NangoSync, SharepointMetadata, SelectedUserFileMetadata, ProxyConfiguration } from '../../models';
import type { DriveItemFromItemResponse } from '../types';
import { toFile } from '../mappers/to-file.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<SharepointMetadata>();

    if (!metadata || !Array.isArray(metadata.pickedFiles) || metadata.pickedFiles.length === 0) {
        throw new Error(`Metadata empty for connection id: ${nango.connectionId}`);
    }

    const fileMetadata: SelectedUserFileMetadata[] = [];

    for (const file of metadata.pickedFiles) {
        const { siteId, fileIds } = file;

        for (const fileId of fileIds) {
            const fileConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/driveitem-get?view=graph-rest-1.0&tabs=http
                endpoint: `/v1.0/sites/${siteId}/drive/items/${fileId}`,
                retries: 10
            };

            const fileResponse = await nango.get<DriveItemFromItemResponse>(fileConfig);
            const fileData = fileResponse.data;

            fileMetadata.push(toFile(fileData, siteId));
        }
    }

    await nango.batchSave(fileMetadata, 'SelectedUserFileMetadata');
}
