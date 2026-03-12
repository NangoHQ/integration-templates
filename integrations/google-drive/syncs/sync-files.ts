import { createSync } from 'nango';
import { z } from 'zod';

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    parents: z.array(z.string()).optional(),
    driveId: z.string().optional(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    size: z.string().optional(),
    webViewLink: z.string().optional(),
    trashed: z.boolean().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const MetadataSchema = z.object({
    files: z.array(z.string()).optional().describe('Array of file IDs to sync directly'),
    folders: z.array(z.string()).optional().describe('Array of folder IDs to sync recursively')
});

type FileRecord = z.infer<typeof FileSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;
type Metadata = z.infer<typeof MetadataSchema>;

type DriveFile = {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    driveId?: string;
    createdTime: string;
    modifiedTime: string;
    size?: string;
    webViewLink?: string;
    trashed?: boolean;
};

type DriveChange = {
    fileId: string;
    removed?: boolean;
    file?: DriveFile;
};

type FileSummary = {
    id: string;
    parents?: string[];
    trashed?: boolean;
};

const sync = createSync({
    description: 'Sync file metadata for IDs in connection metadata files, or recursively for all files under folder IDs in folders. Supports shared drives.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-files', group: 'Files' }],
    frequency: 'every 30 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,

    models: {
        File: FileSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        const metadata = await nango.getMetadata<Metadata>();
        const fileIds = new Set(metadata?.files ?? []);
        const folderIds = new Set(metadata?.folders ?? []);

        if (fileIds.size === 0 && folderIds.size === 0) {
            throw new Error('No file IDs or folder IDs provided in connection metadata. Please set metadata.files or metadata.folders.');
        }

        const directFiles = new Map<string, FileRecord>();
        for (const fileId of fileIds) {
            const file = await fetchDriveFile(nango, fileId, true);
            if (file && !file.trashed) {
                directFiles.set(file.id, mapDriveFile(file));
            }
        }

        if (!checkpoint?.page_token) {
            const initialFiles = new Map<string, FileRecord>(directFiles);

            for (const folderId of folderIds) {
                const folderFiles = await listFilesRecursively(nango, folderId);
                for (const file of folderFiles) {
                    initialFiles.set(file.id, file);
                }
            }

            await persistFileChanges(nango, initialFiles, new Set<string>());

            const startPageToken = await getStartPageToken(nango);
            await nango.saveCheckpoint({
                page_token: startPageToken
            });
            return;
        }

        await persistFileChanges(nango, directFiles, new Set<string>());

        const parentCache = new Map<string, FileSummary | null>();
        let pageToken = checkpoint.page_token;

        while (true) {
            const response = await nango.get<{
                changes?: DriveChange[];
                nextPageToken?: string;
                newStartPageToken?: string;
            }>({
                // https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list
                endpoint: '/drive/v3/changes',
                params: {
                    pageToken,
                    pageSize: '100',
                    supportsAllDrives: 'true',
                    includeItemsFromAllDrives: 'true',
                    includeRemoved: 'true',
                    fields: 'nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,parents,driveId,createdTime,modifiedTime,size,webViewLink,trashed))'
                },
                retries: 3
            });

            const changedFiles = new Map<string, FileRecord>();
            const deletedFileIds = new Set<string>();

            for (const change of response.data.changes ?? []) {
                const fileId = change.fileId;

                if (change.removed) {
                    deletedFileIds.add(fileId);
                    continue;
                }

                const file = change.file ?? (await fetchDriveFile(nango, fileId, false));
                if (!file || file.trashed) {
                    deletedFileIds.add(fileId);
                    continue;
                }

                if (fileIds.has(fileId)) {
                    changedFiles.set(file.id, mapDriveFile(file));
                    continue;
                }

                if (folderIds.size === 0) {
                    continue;
                }

                const isTrackedFolderFile = await isFileTrackedByFolders(nango, file, folderIds, parentCache);
                if (isTrackedFolderFile) {
                    changedFiles.set(file.id, mapDriveFile(file));
                } else {
                    deletedFileIds.add(file.id);
                }
            }

            await persistFileChanges(nango, changedFiles, deletedFileIds);

            const nextPageToken = response.data.nextPageToken;
            if (nextPageToken) {
                pageToken = nextPageToken;
                await nango.saveCheckpoint({
                    page_token: pageToken
                });
                continue;
            }

            if (response.data.newStartPageToken) {
                await nango.saveCheckpoint({
                    page_token: response.data.newStartPageToken
                });
            }

            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

async function fetchDriveFile(nango: NangoSyncLocal, fileId: string, logErrors: boolean): Promise<DriveFile | null> {
    try {
        const response = await nango.get<DriveFile>({
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
            endpoint: `/drive/v3/files/${fileId}`,
            params: {
                supportsAllDrives: 'true',
                fields: 'id,name,mimeType,parents,driveId,createdTime,modifiedTime,size,webViewLink,trashed'
            },
            retries: 3
        });

        return response.data;
    } catch (error) {
        if (logErrors) {
            await nango.log(`Failed to fetch file ${fileId}: ${error}`);
        }

        return null;
    }
}

async function fetchFileSummary(nango: NangoSyncLocal, fileId: string): Promise<FileSummary | null> {
    try {
        const response = await nango.get<FileSummary>({
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
            endpoint: `/drive/v3/files/${fileId}`,
            params: {
                supportsAllDrives: 'true',
                fields: 'id,parents,trashed'
            },
            retries: 3
        });

        return response.data;
    } catch {
        return null;
    }
}

async function getStartPageToken(nango: NangoSyncLocal): Promise<string> {
    const response = await nango.get<{ startPageToken?: string }>({
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/getStartPageToken
        endpoint: '/drive/v3/changes/startPageToken',
        params: {
            supportsAllDrives: 'true'
        },
        retries: 3
    });

    if (!response.data.startPageToken) {
        throw new Error('Failed to get a Google Drive start page token.');
    }

    return response.data.startPageToken;
}

async function listFilesRecursively(nango: NangoSyncLocal, folderId: string): Promise<FileRecord[]> {
    const files: FileRecord[] = [];
    const foldersToProcess: string[] = [folderId];
    const processedFolders = new Set<string>();

    while (foldersToProcess.length > 0) {
        const currentFolderId = foldersToProcess.pop()!;
        if (processedFolders.has(currentFolderId)) {
            continue;
        }

        processedFolders.add(currentFolderId);
        let pageToken: string | undefined;

        while (true) {
            const response = await nango.get<{
                files?: DriveFile[];
                nextPageToken?: string;
            }>({
                // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
                endpoint: '/drive/v3/files',
                params: {
                    q: `'${currentFolderId}' in parents and trashed = false`,
                    supportsAllDrives: 'true',
                    includeItemsFromAllDrives: 'true',
                    fields: 'nextPageToken,files(id,name,mimeType,parents,driveId,createdTime,modifiedTime,size,webViewLink,trashed)',
                    pageSize: '100',
                    ...(pageToken && { pageToken })
                },
                retries: 3
            });

            for (const file of response.data.files ?? []) {
                if (file.trashed) {
                    continue;
                }

                files.push(mapDriveFile(file));

                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    foldersToProcess.push(file.id);
                }
            }

            const nextPageToken = response.data.nextPageToken;
            if (!nextPageToken) {
                break;
            }

            pageToken = nextPageToken;
        }
    }

    return files;
}

async function isFileTrackedByFolders(
    nango: NangoSyncLocal,
    file: DriveFile | FileSummary,
    folderIds: Set<string>,
    parentCache: Map<string, FileSummary | null>,
    visited = new Set<string>()
): Promise<boolean> {
    for (const parentId of file.parents ?? []) {
        if (folderIds.has(parentId)) {
            return true;
        }

        if (visited.has(parentId)) {
            continue;
        }

        visited.add(parentId);

        let parent = parentCache.get(parentId);
        if (parent === undefined) {
            parent = await fetchFileSummary(nango, parentId);
            parentCache.set(parentId, parent);
        }

        if (parent && !parent.trashed && (await isFileTrackedByFolders(nango, parent, folderIds, parentCache, visited))) {
            return true;
        }
    }

    return false;
}

function mapDriveFile(file: DriveFile): FileRecord {
    return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parents: file.parents,
        driveId: file.driveId,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
        trashed: file.trashed
    };
}

async function persistFileChanges(nango: NangoSyncLocal, filesToSave: Map<string, FileRecord>, fileIdsToDelete: Set<string>): Promise<void> {
    if (filesToSave.size > 0) {
        await nango.batchSave(Array.from(filesToSave.values()), 'File');
    }

    if (fileIdsToDelete.size > 0) {
        await nango.batchDelete(
            Array.from(fileIdsToDelete, (id) => ({ id })),
            'File'
        );
    }
}

export default sync;
