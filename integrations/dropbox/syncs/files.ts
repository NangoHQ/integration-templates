import { createSync } from 'nango';
import { z } from 'zod';

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    path_lower: z.string(),
    path_display: z.string(),
    server_modified: z.string(),
    client_modified: z.string(),
    rev: z.string(),
    size: z.number(),
    content_hash: z.string().optional(),
    is_downloadable: z.boolean().optional(),
    has_explicit_shared_members: z.boolean().optional()
});

const FileMetadataSchema = z.object({
    '.tag': z.literal('file'),
    id: z.string(),
    name: z.string(),
    path_lower: z.string(),
    path_display: z.string(),
    server_modified: z.string(),
    client_modified: z.string(),
    rev: z.string(),
    size: z.number(),
    content_hash: z.string().optional(),
    is_downloadable: z.boolean().optional(),
    has_explicit_shared_members: z.boolean().optional()
});

const DeletedMetadataSchema = z.object({
    '.tag': z.literal('deleted'),
    name: z.string(),
    path_lower: z.string(),
    path_display: z.string().optional()
});

const MetadataEntrySchema = z.union([
    z.object({
        '.tag': z.literal('file'),
        id: z.string(),
        name: z.string(),
        path_lower: z.string(),
        path_display: z.string(),
        server_modified: z.string(),
        client_modified: z.string(),
        rev: z.string(),
        size: z.number(),
        content_hash: z.string().optional(),
        is_downloadable: z.boolean().optional(),
        has_explicit_shared_members: z.boolean().optional()
    }),
    z.object({
        '.tag': z.literal('folder'),
        id: z.string(),
        name: z.string(),
        path_lower: z.string(),
        path_display: z.string()
    }),
    DeletedMetadataSchema
]);

const ListFolderResponseSchema = z.object({
    entries: z.array(MetadataEntrySchema),
    cursor: z.string(),
    has_more: z.boolean()
});

const CheckpointSchema = z.object({
    cursors: z.record(z.string(), z.string()).optional()
});

const MetadataSchema = z.object({
    rootPaths: z.array(z.string()).optional()
});

type FileRecord = z.infer<typeof FileSchema>;

function getRootPaths(metadata: z.infer<typeof MetadataSchema>): string[] {
    return metadata.rootPaths && metadata.rootPaths.length > 0 ? metadata.rootPaths : ['/'];
}

function mapEntries(entries: z.infer<typeof MetadataEntrySchema>[]): { files: FileRecord[]; deletedIds: string[] } {
    const files: FileRecord[] = [];
    const deletedIds: string[] = [];

    for (const entry of entries) {
        if (entry['.tag'] === 'file') {
            const fileResult = FileMetadataSchema.safeParse(entry);

            if (!fileResult.success) {
                continue;
            }

            const fileEntry = fileResult.data;
            files.push({
                id: fileEntry.id,
                name: fileEntry.name,
                path_lower: fileEntry.path_lower,
                path_display: fileEntry.path_display,
                server_modified: fileEntry.server_modified,
                client_modified: fileEntry.client_modified,
                rev: fileEntry.rev,
                size: fileEntry.size,
                content_hash: fileEntry.content_hash,
                is_downloadable: fileEntry.is_downloadable,
                has_explicit_shared_members: fileEntry.has_explicit_shared_members
            });
            continue;
        }

        if (entry['.tag'] === 'deleted') {
            const deletedResult = DeletedMetadataSchema.safeParse(entry);

            if (deletedResult.success) {
                deletedIds.push(deletedResult.data.path_lower);
            }
        }
    }

    return { files, deletedIds };
}

const sync = createSync({
    description: 'Sync Dropbox file metadata from configured root paths using list folder cursors.',
    version: '3.0.0',
    frequency: 'every 30 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        File: FileSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/files'
        }
    ],

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
                              include_deleted: true
                          },
                          retries: 3
                      });

                const result = ListFolderResponseSchema.parse(response.data);
                const { files, deletedIds } = mapEntries(result.entries);

                if (files.length > 0) {
                    await nango.batchSave(files, 'File');
                }

                if (deletedIds.length > 0) {
                    await nango.batchDelete(
                        deletedIds.map((path) => ({ id: path })),
                        'File'
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
