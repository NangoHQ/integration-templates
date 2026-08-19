import { createSync } from 'nango';
import { z } from 'zod';

const BoxDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    download_url: z.string().optional(),
    modified_at: z.string()
});

type BoxDocument = z.infer<typeof BoxDocumentSchema>;

const MetadataSchema = z.object({
    files: z.array(z.string()),
    folders: z.array(z.string())
});

const ModelsSchema = {
    BoxDocument: BoxDocumentSchema
};

const CheckpointSchema = z.object({
    folderQueue: z.string(),
    currentFolderId: z.string(),
    folderMarker: z.string(),
    fileQueue: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const EntryItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    modified_at: z.string().optional(),
    shared_link: z
        .object({
            download_url: z.string().optional()
        })
        .optional()
        .nullable()
});

const FolderItemsResponseSchema = z.object({
    entries: z.array(EntryItemSchema),
    next_marker: z.string().nullable().optional()
});

const FileMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    modified_at: z.string(),
    shared_link: z
        .object({
            download_url: z.string().optional()
        })
        .optional()
        .nullable()
});

const sync = createSync<typeof ModelsSchema, typeof MetadataSchema, typeof CheckpointSchema>({
    description: 'Sync the metadata of specified files or folder paths from Box. A file or folder ID can be provided.',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: false,
    endpoints: [
        {
            method: 'GET',
            path: '/files',
            group: 'Files'
        }
    ],
    checkpoint: CheckpointSchema,
    models: ModelsSchema,
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const files = metadata?.files ?? [];
        const folders = metadata?.folders ?? [];
        const batchSize = 100;

        if (files.length === 0 && folders.length === 0) {
            throw new Error('Metadata for files or folders is required.');
        }

        const checkpoint: Checkpoint = (await nango.getCheckpoint()) || {
            folderQueue: '',
            currentFolderId: '',
            folderMarker: '',
            fileQueue: ''
        };

        const folderQueue = checkpoint.folderQueue ? checkpoint.folderQueue.split(',') : folders;
        let currentFolderId = checkpoint.currentFolderId || folderQueue[0];
        let folderMarker = checkpoint.folderMarker || undefined;
        const fileQueue = checkpoint.fileQueue ? checkpoint.fileQueue.split(',') : files;

        await nango.trackDeletesStart('BoxDocument');

        // Process folders recursively using an explicit queue so progress is resumable.
        while (currentFolderId !== undefined) {
            const response = await nango.get({
                // https://developer.box.com/reference/get-folders-id-items/
                endpoint: `/2.0/folders/${currentFolderId}/items`,
                params: {
                    fields: 'id,name,modified_at,shared_link',
                    usemarker: 'true',
                    limit: '1000',
                    ...(folderMarker && { marker: folderMarker })
                },
                retries: 10
            });

            const page = FolderItemsResponseSchema.parse(response.data);

            const batch: BoxDocument[] = [];
            for (const item of page.entries) {
                if (item.type === 'folder') {
                    if (!folderQueue.includes(item.id)) {
                        folderQueue.push(item.id);
                    }
                } else if (item.type === 'file') {
                    if (!item.shared_link) {
                        await nango.log(`Skipping file ${item.id} as it does not have a shared link`, { level: 'debug' });
                        continue;
                    }

                    batch.push({
                        id: item.id,
                        name: item.name,
                        modified_at: item.modified_at ?? '',
                        ...(item.shared_link?.download_url && { download_url: item.shared_link.download_url })
                    });
                }
            }

            if (batch.length > 0) {
                await nango.batchSave(batch, 'BoxDocument');
            }

            const nextMarker = page.next_marker ?? undefined;

            if (nextMarker) {
                folderMarker = nextMarker;
                await nango.saveCheckpoint({
                    folderQueue: folderQueue.join(','),
                    currentFolderId,
                    folderMarker,
                    fileQueue: fileQueue.join(',')
                });
                continue;
            }

            const index = folderQueue.indexOf(currentFolderId);
            if (index !== -1) {
                folderQueue.splice(index, 1);
            }
            folderMarker = undefined;
            currentFolderId = folderQueue[0];

            await nango.saveCheckpoint({
                folderQueue: folderQueue.join(','),
                currentFolderId: currentFolderId || '',
                folderMarker: '',
                fileQueue: fileQueue.join(',')
            });
        }

        // Process individual files from metadata.
        let batch: BoxDocument[] = [];
        while (fileQueue.length > 0) {
            const fileId = fileQueue.shift()!;
            const fileData = await getFileMetadata(nango, fileId);
            batch.push({
                id: fileData.id,
                name: fileData.name,
                modified_at: fileData.modified_at,
                ...(fileData.shared_link?.download_url && { download_url: fileData.shared_link.download_url })
            });

            if (batch.length >= batchSize) {
                await nango.batchSave(batch, 'BoxDocument');
                batch = [];
                await nango.saveCheckpoint({
                    folderQueue: folderQueue.join(','),
                    currentFolderId: currentFolderId || '',
                    folderMarker: '',
                    fileQueue: fileQueue.join(',')
                });
            }
        }

        if (batch.length > 0) {
            await nango.batchSave(batch, 'BoxDocument');
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BoxDocument');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getFileMetadata(nango: NangoSyncLocal, fileId: string) {
    const response = await nango.get({
        // https://developer.box.com/reference/get-files-id/
        endpoint: `/2.0/files/${fileId}`,
        params: {
            fields: 'id,name,modified_at,shared_link'
        },
        retries: 10
    });
    return FileMetadataSchema.parse(response.data);
}
