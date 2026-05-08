import { createSync } from 'nango';
import { z } from 'zod';

const ONE_DRIVE_API_BASE_URL = 'https://api.onedrive.com';

const normalizeOneDriveEndpoint = (link: string): string => {
    return link.startsWith(ONE_DRIVE_API_BASE_URL) ? link.slice(ONE_DRIVE_API_BASE_URL.length) : link;
};

const UserFilesCheckpointSchema = z.object({
    currentFolderId: z.string(),
    nextLink: z.string(),
    pendingFolderIds: z.string()
});

const StoredUserFilesCheckpointSchema = z.union([
    UserFilesCheckpointSchema,
    z.object({
        currentFolderId: z.string().optional(),
        nextLink: z.string().optional(),
        pendingFolderIds: z.string().optional()
    })
]);

const FolderQueueSchema = z.array(z.string());

// OneDrive API uses camelCase for field names
// https://learn.microsoft.com/onedrive/developer/rest-api/resources/driveitem
const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    deleted: z
        .object({
            state: z.string().optional()
        })
        .optional()
});

const ChildrenResponseSchema = z.object({
    value: z.array(DriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const UserFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    mimeType: z.string().optional(),
    isFolder: z.boolean().optional(),
    childCount: z.number().optional(),
    parentId: z.string().optional(),
    parentPath: z.string().optional()
});

const sync = createSync({
    description: 'Sync file metadata from the personal OneDrive',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: UserFilesCheckpointSchema,
    models: {
        UserFile: UserFileSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/user-files'
        }
    ],

    exec: async (nango) => {
        // The OneDrive consumer endpoint at api.onedrive.com rejects /drive/root/delta
        // with "API not found", so keep this as a full tree walk and checkpoint the
        // folder traversal plus @odata.nextLink pagination for resilience.
        const checkpoint = StoredUserFilesCheckpointSchema.nullish().parse(await nango.getCheckpoint());
        const foldersToProcess = checkpoint?.pendingFolderIds ? FolderQueueSchema.parse(JSON.parse(checkpoint.pendingFolderIds)) : ['root'];
        let currentFolderId = checkpoint?.currentFolderId || '';
        let nextLink = checkpoint?.nextLink || '';

        if (!currentFolderId && !nextLink && foldersToProcess.length === 0) {
            foldersToProcess.push('root');
        }

        await nango.trackDeletesStart('UserFile');

        // @allowTryCatch
        try {
        while (currentFolderId || foldersToProcess.length > 0) {
            if (!currentFolderId) {
                const nextFolderId = foldersToProcess.shift();
                if (!nextFolderId) {
                    break;
                }
                currentFolderId = nextFolderId;
            }

            // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_children
            const response = await nango.get({
                endpoint: nextLink || `/v1.0/drive/items/${encodeURIComponent(currentFolderId)}/children`,
                retries: 3
            });

            const childrenResponse = ChildrenResponseSchema.parse(response.data);

            const files = childrenResponse.value
                .filter((item) => !item.deleted)
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    size: item.size,
                    createdDateTime: item.createdDateTime,
                    lastModifiedDateTime: item.lastModifiedDateTime,
                    webUrl: item.webUrl,
                    downloadUrl: item.downloadUrl,
                    mimeType: item.file?.mimeType,
                    isFolder: item.folder !== undefined,
                    childCount: item.folder?.childCount,
                    parentId: item.parentReference?.id,
                    parentPath: item.parentReference?.path
                }));

            if (files.length > 0) {
                await nango.batchSave(files, 'UserFile');
            }

            for (const item of childrenResponse.value) {
                if (item.deleted) {
                    continue;
                }

                if (item.folder?.childCount && item.folder.childCount > 0) {
                    foldersToProcess.push(item.id);
                }
            }

            nextLink = childrenResponse['@odata.nextLink'] ? normalizeOneDriveEndpoint(childrenResponse['@odata.nextLink']) : '';

            if (nextLink || foldersToProcess.length > 0) {
                await nango.saveCheckpoint({
                    currentFolderId: nextLink ? currentFolderId : '',
                    nextLink,
                    pendingFolderIds: JSON.stringify(foldersToProcess)
                });
            }

            if (!nextLink) {
                currentFolderId = '';
            }
        }

            await nango.clearCheckpoint();
        } finally {
            await nango.trackDeletesEnd('UserFile');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
