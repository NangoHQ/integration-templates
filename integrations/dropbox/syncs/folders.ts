import { createSync } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    path_lower: z.string(),
    path_display: z.string(),
    parent_folder_id: z.string().optional()
});

type Folder = z.infer<typeof FolderSchema>;

const CheckpointSchema = z.object({
    cursors: z.record(z.string(), z.string()).optional()
});

const MetadataSchema = z.object({
    root_paths: z.array(z.string()).optional()
});

const FolderMetadataSchema = z.object({
    '.tag': z.literal('folder'),
    id: z.string(),
    name: z.string(),
    path_lower: z.string(),
    path_display: z.string(),
    parent_shared_folder_id: z.string().optional(),
    sharing_info: z
        .object({
            parent_shared_folder_id: z.string().optional()
        })
        .optional()
});

const MetadataEntrySchema = z
    .object({
        '.tag': z.enum(['folder', 'file', 'deleted'])
    })
    .passthrough();

const ListFolderResponseSchema = z.object({
    entries: z.array(MetadataEntrySchema),
    cursor: z.string(),
    has_more: z.boolean()
});

function getRootPaths(metadata: z.infer<typeof MetadataSchema>): string[] {
    return metadata.root_paths && metadata.root_paths.length > 0 ? metadata.root_paths : ['/'];
}

function mapFolders(entries: z.infer<typeof MetadataEntrySchema>[]): Folder[] {
    const folders: Folder[] = [];

    for (const entry of entries) {
        if (entry['.tag'] !== 'folder') {
            continue;
        }

        const folderResult = FolderMetadataSchema.safeParse(entry);

        if (!folderResult.success) {
            continue;
        }

        const folder = folderResult.data;
        const parentFolderId = folder.parent_shared_folder_id ?? folder.sharing_info?.parent_shared_folder_id;

        folders.push({
            id: folder.id,
            name: folder.name,
            path_lower: folder.path_lower,
            path_display: folder.path_display,
            ...(parentFolderId ? { parent_folder_id: parentFolderId } : {})
        });
    }

    return folders;
}

const sync = createSync({
    description: 'Sync Dropbox folder metadata from configured root paths.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/folders' }],
    frequency: 'every hour',
    autoStart: true,
    scopes: ['files.metadata.read'],
    metadata: MetadataSchema,
    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const rawConnection = z
            .object({ metadata: z.unknown().optional(), data: z.object({ metadata: z.unknown().optional() }).optional() })
            .parse(await nango.getConnection());
        const metadata = MetadataSchema.parse(rawConnection.metadata ?? rawConnection.data?.metadata ?? {});
        const rootPaths = getRootPaths(metadata);
        const cursors: Record<string, string> = { ...(checkpoint.cursors ?? {}) };

        for (const rootPath of rootPaths) {
            let cursor = cursors[rootPath];
            let hasMore = true;

            while (hasMore) {
                const response = cursor
                    ? await nango.post({
                          // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
                          endpoint: '/2/files/list_folder/continue',
                          data: { cursor },
                          retries: 3
                      })
                    : await nango.post({
                          // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
                          endpoint: '/2/files/list_folder',
                          data: {
                              path: rootPath === '/' ? '' : rootPath,
                              recursive: true,
                              include_deleted: false
                          },
                          retries: 3
                      });

                const result = ListFolderResponseSchema.parse(response.data);
                const folders = mapFolders(result.entries);

                if (folders.length > 0) {
                    await nango.batchSave(folders, 'Folder');
                }

                cursor = result.cursor;
                cursors[rootPath] = cursor;
                // @ts-expect-error - nango.saveCheckpoint has incorrect type inference in SDK
                await nango.saveCheckpoint({ cursors });
                hasMore = result.has_more;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
