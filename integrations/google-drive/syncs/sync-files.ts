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
    updatedAfter: z.string()
});

const MetadataSchema = z.object({
    files: z.array(z.string()).optional().describe('Array of file IDs to sync directly'),
    folders: z.array(z.string()).optional().describe('Array of folder IDs to sync recursively')
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

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
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        const metadata = parseOptional(MetadataSchema, await nango.getMetadata());

        const fileIds = metadata?.files || [];
        const folderIds = metadata?.folders || [];

        if (fileIds.length === 0 && folderIds.length === 0) {
            throw new Error('No file IDs or folder IDs provided in connection metadata. Please set metadata.files or metadata.folders.');
        }

        const allFiles: z.infer<typeof FileSchema>[] = [];

        // Sync specific files by ID
        for (const fileId of fileIds) {
            try {
                const response = await nango.get({
                    // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
                    endpoint: `/drive/v3/files/${fileId}`,
                    params: {
                        supportsAllDrives: 'true',
                        fields: 'id,name,mimeType,parents,driveId,createdTime,modifiedTime,size,webViewLink,trashed'
                    },
                    retries: 3
                });

                if (response.data && !response.data.trashed) {
                    allFiles.push(FileSchema.parse(response.data));
                }
            } catch (error) {
                await nango.log(`Failed to fetch file ${fileId}: ${error}`);
            }
        }

        // Recursively sync files under specified folders
        for (const folderId of folderIds) {
            const folderFiles = await listFilesRecursively(nango, folderId, checkpoint?.updatedAfter);
            allFiles.push(...folderFiles);
        }

        // Batch save all collected files
        if (allFiles.length > 0) {
            await nango.batchSave(allFiles, 'File');

            // Save checkpoint with the most recent modified time
            const mostRecentTime = allFiles
                .map((f) => f.modifiedTime)
                .sort()
                .pop();

            if (mostRecentTime) {
                await nango.saveCheckpoint({
                    updatedAfter: mostRecentTime
                });
            }
        }
    }
});

async function listFilesRecursively(nango: any, folderId: string, updatedAfter?: string): Promise<z.infer<typeof FileSchema>[]> {
    const files: z.infer<typeof FileSchema>[] = [];
    const foldersToProcess: string[] = [folderId];
    const processedFolders = new Set<string>();

    while (foldersToProcess.length > 0) {
        const currentFolderId = foldersToProcess.pop()!;

        if (processedFolders.has(currentFolderId)) {
            continue;
        }
        processedFolders.add(currentFolderId);

        // Build query to get files in this folder
        let query = `'${currentFolderId}' in parents and trashed = false`;
        if (updatedAfter) {
            query += ` and modifiedTime > '${updatedAfter}'`;
        }

        // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
        const proxyConfig = {
            endpoint: '/drive/v3/files',
            params: {
                q: query,
                supportsAllDrives: 'true',
                includeItemsFromAllDrives: 'true',
                fields: 'nextPageToken,files(id,name,mimeType,parents,driveId,createdTime,modifiedTime,size,webViewLink,trashed)',
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
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsedBatch = z.array(FileSchema).parse(batch);
            for (const file of parsedBatch) {
                if (file.trashed) {
                    continue;
                }

                files.push(file);

                // If this is a folder, add it to the queue for recursive processing
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    foldersToProcess.push(file.id);
                }
            }
        }
    }

    return files;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
