import { createSync } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('folder'),
    description: z.string().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    trashed_at: z.string().nullish(),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .passthrough()
        .optional()
});

const CheckpointSchema = z.object({
    currentFolderId: z.string(),
    marker: z.string(),
    folderQueue: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const _ItemSchema = z.union([
    z
        .object({
            id: z.string(),
            type: z.literal('folder'),
            name: z.string(),
            description: z.string().optional(),
            size: z.number().optional(),
            created_at: z.string().optional(),
            modified_at: z.string().optional(),
            trashed_at: z.string().nullish(),
            parent: z
                .object({
                    id: z.string(),
                    name: z.string().optional()
                })
                .passthrough()
                .optional()
        })
        .passthrough(),
    z.object({
        id: z.string(),
        type: z.enum(['file', 'web_link'])
    })
]);

type Item = z.infer<typeof _ItemSchema>;

const FolderItemsResponseSchema = z.object({
    entries: z.array(_ItemSchema),
    next_marker: z.string().nullable().optional()
});

const sync = createSync<{ Folder: typeof FolderSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync folders from Box',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/folders'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        const checkpoint: Checkpoint = (await nango.getCheckpoint()) || {
            currentFolderId: '',
            marker: '',
            folderQueue: ''
        };

        const folderQueue = checkpoint.folderQueue ? String(checkpoint.folderQueue).split(',') : ['0'];
        let currentFolderId = checkpoint.currentFolderId ? String(checkpoint.currentFolderId) : folderQueue[0];
        let marker = checkpoint.marker ? String(checkpoint.marker) : undefined;

        await nango.trackDeletesStart('Folder');

        while (currentFolderId !== undefined) {
            // https://developer.box.com/reference/get-folders-id-items/
            const response = await nango.get({
                endpoint: `/2.0/folders/${currentFolderId}/items`,
                params: {
                    usemarker: 'true',
                    limit: '1000',
                    fields: 'id,type,name,description,size,created_at,modified_at,trashed_at,parent',
                    ...(marker && { marker })
                },
                retries: 3
            });

            const page = FolderItemsResponseSchema.parse(response.data);

            const folders = page.entries
                .filter((item): item is Extract<Item, { type: 'folder' }> => item.type === 'folder')
                .map((folder) => {
                    return {
                        id: folder.id,
                        name: folder.name,
                        type: 'folder',
                        description: folder.description,
                        size: folder.size,
                        created_at: folder.created_at,
                        modified_at: folder.modified_at,
                        trashed_at: folder.trashed_at,
                        parent: folder.parent
                    };
                });

            const subFolders = folders.filter((folder) => folder.id !== currentFolderId);
            for (const subFolder of subFolders) {
                if (!folderQueue.includes(subFolder.id)) {
                    folderQueue.push(subFolder.id);
                }
            }

            if (folders.length > 0) {
                await nango.batchSave(folders, 'Folder');
            }

            const nextMarker = page.next_marker ?? undefined;
            await nango.saveCheckpoint({
                currentFolderId,
                folderQueue: folderQueue.join(','),
                marker: nextMarker ?? ''
            });

            if (nextMarker) {
                marker = nextMarker;
                continue;
            }

            const index = folderQueue.indexOf(currentFolderId);
            if (index !== -1) {
                folderQueue.splice(index, 1);
            }

            marker = undefined;
            currentFolderId = folderQueue[0];

            await nango.saveCheckpoint({
                currentFolderId: currentFolderId || '',
                folderQueue: folderQueue.join(','),
                marker: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
