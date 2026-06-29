import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string()
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    itemCount: z.string().optional(),
    subFolderCount: z.string().optional(),
    folderUri: z.string().optional(),
    ownerUserId: z.string().optional(),
    parentFolderId: z.string().optional(),
    parentFolderUri: z.string().optional()
});

const ProviderFolderSchema = z.object({
    folderId: z.string(),
    folderUri: z.string().optional(),
    name: z.string(),
    type: z.string(),
    itemCount: z.string().optional(),
    subFolderCount: z.string().optional(),
    ownerUserId: z.string().optional(),
    parentFolderId: z.string().optional(),
    parentFolderUri: z.string().optional()
});

const sync = createSync({
    description: 'Sync envelope folder structure with full-refresh delete tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Folder: FolderSchema
    },
    // https://developers.docusign.com/docs/esign-rest-api/reference/folders/folderslist/
    endpoints: [{ method: 'GET', path: '/syncs/folders' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('accountId is required in metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        await nango.trackDeletesStart('Folder');

        const limit = 50;
        let offset = 0;
        const hasMore = true;
        while (hasMore) {
            // https://developers.docusign.com/docs/esign-rest-api/reference/folders/folderslist/
            const response = await nango.get({
                endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/folders`,
                params: {
                    count: limit,
                    start_position: offset
                },
                retries: 3
            });

            const parsedResponse = z
                .object({
                    folders: z.array(ProviderFolderSchema).optional()
                })
                .safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse folders response: ${parsedResponse.error.message}`);
            }

            const folders = parsedResponse.data.folders ?? [];
            if (folders.length === 0) {
                break;
            }

            const records = folders.map((folder) => ({
                id: folder.folderId,
                name: folder.name,
                type: folder.type,
                ...(folder.itemCount !== undefined && { itemCount: folder.itemCount }),
                ...(folder.subFolderCount !== undefined && { subFolderCount: folder.subFolderCount }),
                ...(folder.folderUri !== undefined && { folderUri: folder.folderUri }),
                ...(folder.ownerUserId !== undefined && { ownerUserId: folder.ownerUserId }),
                ...(folder.parentFolderId !== undefined && { parentFolderId: folder.parentFolderId }),
                ...(folder.parentFolderUri !== undefined && { parentFolderUri: folder.parentFolderUri })
            }));

            await nango.batchSave(records, 'Folder');

            if (folders.length < limit) {
                break;
            }

            offset += folders.length;
        }

        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
