import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const CollectionFolderSchema = z.object({
    id: z.string(),
    folder_id: z.number(),
    name: z.string(),
    count: z.number().optional(),
    resource_url: z.string().optional()
});

const CollectionItemSchema = z.object({
    id: z.string(),
    folder_id: z.number(),
    instance_id: z.number(),
    release_id: z.number().optional(),
    rating: z.number().optional(),
    date_added: z.string().optional(),
    basic_information: z.record(z.string(), z.unknown()).optional()
});

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    count: z.number().optional(),
    resource_url: z.string().optional()
});

const ProviderCollectionReleaseSchema = z
    .object({
        id: z.number(),
        instance_id: z.number(),
        rating: z.number().nullish(),
        date_added: z.string().nullish(),
        basic_information: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync collection folders and releases for the authenticated user.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    endpoints: [
        { method: 'GET', path: '/collection/folders', group: 'Collection' },
        { method: 'GET', path: '/collection/items', group: 'Collection' }
    ],
    models: {
        CollectionFolder: CollectionFolderSchema,
        CollectionItem: CollectionItemSchema
    },

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-collection,header-user-collection-collection-folders
        const foldersResponse = await nango.get({
            endpoint: `/users/${encodeURIComponent(username)}/collection/folders`,
            retries: 3
        });

        const { folders: rawFolders } = z.object({ folders: z.array(ProviderFolderSchema) }).parse(foldersResponse.data);

        await nango.trackDeletesStart('CollectionFolder');
        await nango.trackDeletesStart('CollectionItem');
        const nonUncategorized = rawFolders.filter((folder) => folder.id !== 0);
        const skipUncategorized = nonUncategorized.some((folder) => (folder.count ?? 0) > 0);
        const foldersToSync = skipUncategorized ? rawFolders.filter((folder) => folder.id !== 0) : rawFolders;

        const folderRecords = foldersToSync.map((folder) => ({
            id: String(folder.id),
            folder_id: folder.id,
            name: folder.name,
            ...(folder.count !== undefined && { count: folder.count }),
            ...(folder.resource_url !== undefined && { resource_url: folder.resource_url })
        }));

        if (folderRecords.length > 0) {
            await nango.batchSave(folderRecords, 'CollectionFolder');
        }

        for (const folder of foldersToSync) {
            const proxyConfig: ProxyConfiguration = {
                // https://www.discogs.com/developers#page:user-collection,header-user-collection-collection-items-by-release-date
                endpoint: `/users/${encodeURIComponent(username)}/collection/folders/${folder.id}/releases`,
                retries: 3,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    response_path: 'releases',
                    limit_name_in_request: 'per_page',
                    limit: 100
                }
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const releases = z.array(ProviderCollectionReleaseSchema).parse(page);
                const items = releases.map((release) => ({
                    id: `${folder.id}-${release.instance_id}`,
                    folder_id: folder.id,
                    instance_id: release.instance_id,
                    release_id: release.id,
                    ...(release.rating != null && { rating: release.rating }),
                    ...(release.date_added != null && { date_added: release.date_added }),
                    ...(release.basic_information !== undefined && { basic_information: release.basic_information })
                }));

                if (items.length > 0) {
                    await nango.batchSave(items, 'CollectionItem');
                }
            }
        }
        await nango.trackDeletesEnd('CollectionFolder');
        await nango.trackDeletesEnd('CollectionItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
