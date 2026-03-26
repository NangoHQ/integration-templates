import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const sync = createSync({
    description: 'Sync root-level Google Drive folders from My Drive and shared drives',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/folders', group: 'Folders' }],
    frequency: 'every hour',
    autoStart: true,

    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Folder');

        const allFolders: Array<z.infer<typeof FolderSchema>> = [];

        // Fetch root-level folders from My Drive
        // https://developers.google.com/drive/api/reference/rest/v3/files/list
        const myDriveConfig = {
            endpoint: '/drive/v3/files',
            params: {
                q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
                fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
                corpora: 'user',
                pageSize: '100'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'files',
                limit: 100
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(myDriveConfig)) {
            const folders = batch.map((file: { id: string; name?: string; createdTime?: string; modifiedTime?: string }) => ({
                id: file.id,
                name: file.name ?? undefined,
                createdTime: file.createdTime ?? undefined,
                modifiedTime: file.modifiedTime ?? undefined
            }));
            allFolders.push(...folders);
        }

        // Fetch shared drives first
        // https://developers.google.com/drive/api/reference/rest/v3/drives/list
        const drivesConfig = {
            endpoint: '/drive/v3/drives',
            params: {
                fields: 'nextPageToken,drives(id)',
                pageSize: '100'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'drives',
                limit: 100
            },
            retries: 3
        } satisfies ProxyConfiguration;

        const drives: Array<{ id: string }> = [];
        for await (const batch of nango.paginate(drivesConfig)) {
            drives.push(...batch);
        }

        // Fetch root-level folders from each shared drive
        for (const drive of drives) {
            const driveFoldersConfig = {
                endpoint: '/drive/v3/files',
                params: {
                    q: `mimeType='application/vnd.google-apps.folder' and '${drive.id}' in parents and trashed=false`,
                    fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
                    corpora: 'drive',
                    driveId: drive.id,
                    includeItemsFromAllDrives: 'true',
                    supportsAllDrives: 'true',
                    pageSize: '100'
                },
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'nextPageToken',
                    cursor_name_in_request: 'pageToken',
                    response_path: 'files',
                    limit: 100
                },
                retries: 3
            } satisfies ProxyConfiguration;

            for await (const batch of nango.paginate(driveFoldersConfig)) {
                const folders = batch.map((file: { id: string; name?: string; createdTime?: string; modifiedTime?: string }) => ({
                    id: file.id,
                    name: file.name ?? undefined,
                    createdTime: file.createdTime ?? undefined,
                    modifiedTime: file.modifiedTime ?? undefined
                }));
                allFolders.push(...folders);
            }
        }

        if (allFolders.length > 0) {
            await nango.batchSave(allFolders, 'Folder');
        }

        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
