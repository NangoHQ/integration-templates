import { createSync } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    dropbox_id: z.string(),
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

const DeletedEntrySchema = z.object({ '.tag': z.literal('deleted'), path_lower: z.string().optional() }).passthrough();

const CursorResetErrorSchema = z.object({
    response: z.object({ data: z.object({ error: z.object({ '.tag': z.string() }) }) })
});

const ListFolderResponseSchema = z.object({
    entries: z.array(MetadataEntrySchema),
    cursor: z.string(),
    has_more: z.boolean()
});

function getRootPaths(metadata: z.infer<typeof MetadataSchema>): string[] {
    return metadata.root_paths && metadata.root_paths.length > 0 ? metadata.root_paths : ['/'];
}

function mapFolders(entries: z.infer<typeof MetadataEntrySchema>[]): { folders: Folder[]; deletedPaths: string[] } {
    const folders: Folder[] = [];
    const deletedPaths: string[] = [];

    for (const entry of entries) {
        if (entry['.tag'] === 'deleted') {
            const deleted = DeletedEntrySchema.safeParse(entry);
            if (deleted.success && deleted.data.path_lower) {
                deletedPaths.push(deleted.data.path_lower);
            }
            continue;
        }

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
            id: folder.path_lower,
            dropbox_id: folder.id,
            name: folder.name,
            path_lower: folder.path_lower,
            path_display: folder.path_display,
            ...(parentFolderId ? { parent_folder_id: parentFolderId } : {})
        });
    }

    return { folders, deletedPaths };
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
            let cursor: string | undefined = cursors[rootPath];
            let hasMore = true;

            while (hasMore) {
                let response;

                if (cursor) {
                    // @allowTryCatch - Handle Dropbox 409 cursor-reset errors
                    try {
                        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
                        response = await nango.post({
                            endpoint: '/2/files/list_folder/continue',
                            data: { cursor },
                            retries: 3
                        });
                    } catch (err: unknown) {
                        const parsed = CursorResetErrorSchema.safeParse(err);
                        if (parsed.success && parsed.data.response.data.error['.tag'] === 'reset') {
                            cursor = undefined;
                            delete cursors[rootPath];
                            continue;
                        }
                        throw err;
                    }
                } else {
                    // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
                    response = await nango.post({
                        endpoint: '/2/files/list_folder',
                        data: {
                            path: rootPath === '/' ? '' : rootPath,
                            recursive: true,
                            include_deleted: true
                        },
                        retries: 3
                    });
                }

                const result = ListFolderResponseSchema.parse(response.data);
                const { folders, deletedPaths } = mapFolders(result.entries);

                if (folders.length > 0) {
                    await nango.batchSave(folders, 'Folder');
                }

                if (deletedPaths.length > 0) {
                    await nango.batchDelete(
                        deletedPaths.map((path) => ({ id: path })),
                        'Folder'
                    );
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
