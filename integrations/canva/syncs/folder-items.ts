import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    folder_ids: z.array(z.string()).min(1)
});

const CheckpointSchema = z.object({
    folder_index: z.number().int().nonnegative(),
    continuation: z.string()
});

const FolderItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    folder_id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    thumbnail: z.unknown().optional(),
    page_count: z.number().optional(),
    tags: z.array(z.string()).optional()
});

const ProviderFolderItemSchema = z.object({
    type: z.enum(['folder', 'design', 'image']),
    folder: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            created_at: z.number().optional(),
            updated_at: z.number().optional(),
            thumbnail: z.unknown().optional()
        })
        .optional(),
    design: z
        .object({
            id: z.string(),
            title: z.string().optional(),
            url: z.string().optional(),
            created_at: z.number().optional(),
            updated_at: z.number().optional(),
            thumbnail: z.unknown().optional(),
            page_count: z.number().optional()
        })
        .optional(),
    image: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            created_at: z.number().optional(),
            updated_at: z.number().optional(),
            thumbnail: z.unknown().optional(),
            tags: z.array(z.string()).optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync the contents of configured Canva folders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    scopes: ['folder:read'],
    models: {
        FolderItem: FolderItemSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;

        const checkpoint = await nango.getCheckpoint();
        const folderIndex = checkpoint != null && typeof checkpoint['folder_index'] === 'number' ? checkpoint['folder_index'] : 0;
        const continuation =
            checkpoint != null && typeof checkpoint['continuation'] === 'string' && checkpoint['continuation'].length > 0
                ? checkpoint['continuation']
                : undefined;

        if (checkpoint == null) {
            await nango.trackDeletesStart('FolderItem');
        }

        for (let i = folderIndex; i < metadata.folder_ids.length; i++) {
            const folderId = metadata.folder_ids[i];
            if (!folderId) {
                throw new Error(`folder_ids[${i}] is undefined`);
            }

            let nextContinuation: string | undefined = i === folderIndex ? continuation : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://www.canva.dev/docs/connect/api-reference/folders/
                endpoint: `/rest/v1/folders/${encodeURIComponent(folderId)}/items`,
                params: {
                    ...(nextContinuation != null && { continuation: nextContinuation })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'continuation',
                    cursor_path_in_response: 'continuation',
                    response_path: 'items',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextContinuation = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const items of nango.paginate(proxyConfig)) {
                const parsedItems = z.array(ProviderFolderItemSchema).safeParse(items);
                if (!parsedItems.success) {
                    throw new Error(`Failed to parse folder items: ${parsedItems.error.message}`);
                }

                const folderItems = parsedItems.data.map((item) => {
                    if (item.type === 'folder' && item.folder) {
                        return {
                            id: item.folder.id,
                            type: item.type,
                            folder_id: folderId,
                            ...(item.folder.name != null && { name: item.folder.name }),
                            ...(item.folder.created_at != null && { created_at: item.folder.created_at }),
                            ...(item.folder.updated_at != null && { updated_at: item.folder.updated_at }),
                            ...(item.folder.thumbnail != null && { thumbnail: item.folder.thumbnail })
                        };
                    }

                    if (item.type === 'design' && item.design) {
                        return {
                            id: item.design.id,
                            type: item.type,
                            folder_id: folderId,
                            ...(item.design.title != null && { name: item.design.title }),
                            ...(item.design.url != null && { url: item.design.url }),
                            ...(item.design.created_at != null && { created_at: item.design.created_at }),
                            ...(item.design.updated_at != null && { updated_at: item.design.updated_at }),
                            ...(item.design.thumbnail != null && { thumbnail: item.design.thumbnail }),
                            ...(item.design.page_count != null && { page_count: item.design.page_count })
                        };
                    }

                    if (item.type === 'image' && item.image) {
                        return {
                            id: item.image.id,
                            type: item.type,
                            folder_id: folderId,
                            ...(item.image.name != null && { name: item.image.name }),
                            ...(item.image.created_at != null && { created_at: item.image.created_at }),
                            ...(item.image.updated_at != null && { updated_at: item.image.updated_at }),
                            ...(item.image.thumbnail != null && { thumbnail: item.image.thumbnail }),
                            ...(item.image.tags != null && { tags: item.image.tags })
                        };
                    }

                    throw new Error(`Unexpected folder item type: ${item.type}`);
                });

                if (folderItems.length > 0) {
                    await nango.batchSave(folderItems, 'FolderItem');
                }

                if (nextContinuation !== undefined) {
                    await nango.saveCheckpoint({
                        folder_index: i,
                        continuation: nextContinuation
                    });
                }
            }

            await nango.saveCheckpoint({
                folder_index: i + 1,
                continuation: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FolderItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
