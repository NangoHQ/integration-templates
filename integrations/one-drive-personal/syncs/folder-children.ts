import { createSync } from 'nango';
import { z } from 'zod';

const ONE_DRIVE_API_BASE_URL = 'https://api.onedrive.com';

const normalizeOneDriveEndpoint = (link: string): string => {
    return link.startsWith(ONE_DRIVE_API_BASE_URL) ? link.slice(ONE_DRIVE_API_BASE_URL.length) : link;
};

const MetadataSchema = z.object({
    folderIds: z.array(z.string()).min(1).describe('OneDrive item IDs for folders to sync children from')
});

const FolderChildrenCheckpointSchema = z.object({
    currentFolderIndex: z.number().int().nonnegative(),
    nextLink: z.string(),
    folderIdsKey: z.string()
});

const StoredFolderChildrenCheckpointSchema = z.union([
    FolderChildrenCheckpointSchema,
    z.object({
        currentFolderIndex: z.number().int().nonnegative(),
        nextLink: z.string().optional(),
        folderIdsKey: z.string().optional()
    })
]);

const OneDriveDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    folder: z.object({}).optional(),
    file: z.object({}).optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    deleted: z.object({}).optional()
});

const ListChildrenResponseSchema = z.object({
    value: z.array(OneDriveDriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const FolderChildSchema = z.object({
    id: z.string(),
    name: z.string(),
    folderId: z.string(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    isFolder: z.boolean(),
    parentId: z.string().optional()
});

type OneDriveDriveItem = z.infer<typeof OneDriveDriveItemSchema>;
type FolderChildrenCheckpoint = z.infer<typeof FolderChildrenCheckpointSchema>;

const sync = createSync({
    description: 'Sync children for selected folders',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/folder-children',
            method: 'POST'
        }
    ],
    checkpoint: FolderChildrenCheckpointSchema,
    models: {
        FolderChild: FolderChildSchema
    },

    exec: async (nango) => {
        let folderIds: string[];

        const rawMetadata = await nango.getMetadata();
        if (rawMetadata) {
            const metadata = MetadataSchema.parse(rawMetadata);
            folderIds = metadata.folderIds;
        } else {
            await nango.log('No metadata configured, using root folder');
            folderIds = ['root'];
        }

        if (folderIds.length === 0) {
            await nango.log('No folderIds configured, skipping sync');
            return;
        }

        const folderIdsKey = JSON.stringify(folderIds);
        const checkpoint = StoredFolderChildrenCheckpointSchema.nullish().parse(await nango.getCheckpoint());
        let startIndex = checkpoint?.currentFolderIndex ?? 0;
        let nextLink = checkpoint?.nextLink || undefined;
        const checkpointFolderIdsKey = checkpoint?.folderIdsKey || '';

        // Restart from the beginning if the configured folder set changed or the
        // saved checkpoint points past the current selection.
        if ((checkpointFolderIdsKey !== '' && checkpointFolderIdsKey !== folderIdsKey) || startIndex >= folderIds.length) {
            startIndex = 0;
            nextLink = undefined;
        }

        await nango.trackDeletesStart('FolderChild');

        // @allowTryCatch
        try {
            for (let i = startIndex; i < folderIds.length; i++) {
                const folderIdVal = folderIds[i];
                if (folderIdVal === undefined) {
                    continue;
                }
                const folderId = folderIdVal;

                await nango.log(`Syncing children for folder: ${folderId}`);

                let endpoint = nextLink ?? `/v1.0/drive/items/${encodeURIComponent(folderId)}/children`;
                nextLink = undefined;

                while (true) {
                    // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_children
                    const response = await nango.get({
                        endpoint,
                        retries: 3
                    });

                    const childrenResponse = ListChildrenResponseSchema.parse(response.data);
                    const children = childrenResponse.value.map((item: OneDriveDriveItem) => ({
                        id: `${folderId}-${item.id}`,
                        name: item.name,
                        folderId: folderId,
                        size: item.size,
                        createdDateTime: item.createdDateTime,
                        lastModifiedDateTime: item.lastModifiedDateTime,
                        webUrl: item.webUrl,
                        description: item.description,
                        isFolder: item.folder !== undefined,
                        parentId: item.parentReference?.id
                    }));

                    if (children.length > 0) {
                        await nango.batchSave(children, 'FolderChild');
                    }

                    const nextPage = childrenResponse['@odata.nextLink'];
                    if (!nextPage) {
                        break;
                    }

                    endpoint = normalizeOneDriveEndpoint(nextPage);
                    await nango.saveCheckpoint({
                        currentFolderIndex: i,
                        nextLink: endpoint,
                        folderIdsKey
                    });
                }

                if (i + 1 < folderIds.length) {
                    const nextCheckpoint: FolderChildrenCheckpoint = {
                        currentFolderIndex: i + 1,
                        nextLink: '',
                        folderIdsKey
                    };
                    await nango.saveCheckpoint(nextCheckpoint);
                }
            }

            await nango.clearCheckpoint();
        } finally {
            await nango.trackDeletesEnd('FolderChild');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
