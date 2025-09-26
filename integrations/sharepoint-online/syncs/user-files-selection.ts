import { createSync } from 'nango';
import type { DriveItemFromItemResponse } from '../types.js';
import { toFile } from '../mappers/to-file.js';

import type { ProxyConfiguration } from 'nango';
import { SelectedUserFileMetadata, SharepointMetadata } from '../models.js';

const sync = createSync({
    description: "Fetch all selected files from a user's drive",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/user-files/selected'
        }
    ],

    scopes: ['Sites.Read.All', 'Sites.Selected', 'MyFiles.Read', 'Files.Read.All', 'Files.Read.Selected', 'offline_access'],

    models: {
        SelectedUserFileMetadata: SelectedUserFileMetadata
    },

    metadata: SharepointMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
