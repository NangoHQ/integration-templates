import { createSync } from 'nango';
import type { DriveResponse, DriveItem } from '../types.js';
import { toFile } from '../mappers/to-file.js';

import type { ProxyConfiguration } from 'nango';
import { OneDriveFile } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: "Fetch all files from the user's OneDrive and sync the metadata for each file.",
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/user-files',
            group: 'Files'
        }
    ],

    scopes: ['Files.Read', 'Files.Read.All', 'offline_access'],

    models: {
        OneDriveFile: OneDriveFile
    },

    metadata: z.object({}),

    exec: async (nango) => {
        // Get the user's drives
        // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
        const driveConfiguration: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/drive-list?view=graph-rest-1.0
            endpoint: '/v1.0/me/drives',
            retries: 10
        };

        const driveResponse = await nango.get<DriveResponse>(driveConfiguration);
        const { value: drives } = driveResponse.data;

        const files: any[] = [];
        const BATCH_SIZE = 100;

        for (const drive of drives) {
            const { id } = drive;

            // Get items in the root folder of the drive
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
            const itemsConfiguration: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0
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

            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
            try {
                for await (const items of nango.paginate(itemsConfiguration)) {
                    for (const item of items) {
                        await fetchFilesRecursive(nango, id, item, files);
                        if (files.length >= BATCH_SIZE) {
                            await nango.log(`Batch saving ${files.length} files`);
                            await nango.batchSave(files, 'OneDriveFile');
                            files.length = 0;
                        }
                    }
                }
            } catch (error: any) {
                const errorMessage = error?.response?.data?.error?.message;
                const isObjectHandleInvalid = typeof errorMessage === 'string' && errorMessage.includes('ObjectHandle is Invalid');

                if (isObjectHandleInvalid) {
                    await nango.log(`Skipping drive '${drive.name}' (${id}). Could not list items. Error: ${errorMessage}.`);
                    continue;
                }

                throw error;
            }
        }
        if (files.length > 0) {
            await nango.log(`Batch saving remaining ${files.length} files`);
            await nango.batchSave(files, 'OneDriveFile');
        }
        await nango.deleteRecordsFromPreviousExecutions('OneDriveFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchFilesRecursive(nango: NangoSyncLocal, driveId: string, item: DriveItem, files: any[], depth = 3) {
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

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
        try {
            for await (const childItems of nango.paginate(folderConfig)) {
                for (const childItem of childItems) {
                    await fetchFilesRecursive(nango, driveId, childItem, files, depth - 1);
                }
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.error?.message;
            const isObjectHandleInvalid = typeof errorMessage === 'string' && errorMessage.includes('ObjectHandle is Invalid');

            if (isObjectHandleInvalid) {
                await nango.log(`Skipping folder '${item.name}' (${item.id}) in drive ${driveId}. Could not list items. Error: ${errorMessage}`);
                return;
            }

            throw error;
        }
    }
}
