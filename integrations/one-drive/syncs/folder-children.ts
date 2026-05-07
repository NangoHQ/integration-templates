import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Microsoft Graph DriveItem representation
 * https://learn.microsoft.com/graph/api/resources/driveitem
 */
const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    parentReference: z
        .object({
            id: z.string().optional(),
            driveId: z.string().optional(),
            path: z.string().optional()
        })
        .passthrough()
        .optional(),
    folder: z.object({ childCount: z.number() }).optional(),
    file: z.object({ mimeType: z.string() }).optional()
});

/**
 * Output model for folder children
 */
const FolderChildSchema = z.object({
    id: z.string(),
    folderId: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string(),
    lastModifiedDateTime: z.string(),
    driveId: z.string().optional(),
    parentPath: z.string().optional(),
    isFolder: z.boolean(),
    mimeType: z.string().optional()
});

type FolderChild = z.infer<typeof FolderChildSchema>;

/**
 * Metadata input schema - folder IDs to sync
 */
const MetadataSchema = z.object({
    folderIds: z.array(z.string())
});

/**
 * Checkpoint for a checkpointed full refresh across folders and paginated children results.
 */
const CheckpointSchema = z.object({
    folderIndex: z.number(),
    nextEndpoint: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function normalizeGraphEndpoint(link: string | undefined): string {
    if (!link) {
        return '';
    }

    try {
        const url = new URL(link, 'https://graph.microsoft.com');
        return `${url.pathname}${url.search}`;
    } catch {
        return link;
    }
}

const sync = createSync({
    description: 'Sync children for selected folders',
    version: '1.0.0',
    frequency: 'every hour',
    endpoints: [{ method: 'POST', path: '/syncs/folder-children' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        FolderChild: FolderChildSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const folderIds = metadata?.folderIds;

        if (!folderIds || folderIds.length === 0) {
            await nango.log('No folder IDs provided in metadata; skipping sync');
            return;
        }

        const checkpoint = await nango.getCheckpoint();
        const hasLegacyCheckpoint = checkpoint !== null && checkpoint !== undefined && Object.prototype.hasOwnProperty.call(checkpoint, 'lastModifiedDateTime');

        if (hasLegacyCheckpoint) {
            await nango.clearCheckpoint();
        }

        let typedCheckpoint: Checkpoint = {
            folderIndex: !hasLegacyCheckpoint && typeof checkpoint?.folderIndex === 'number' ? checkpoint.folderIndex : 0,
            nextEndpoint: !hasLegacyCheckpoint && typeof checkpoint?.nextEndpoint === 'string' ? checkpoint.nextEndpoint : ''
        };

        if (typedCheckpoint.folderIndex < 0 || typedCheckpoint.folderIndex >= folderIds.length) {
            typedCheckpoint = {
                folderIndex: 0,
                nextEndpoint: ''
            };

            if (!hasLegacyCheckpoint && checkpoint !== null) {
                await nango.clearCheckpoint();
            }
        }

        const isResuming = typedCheckpoint.folderIndex > 0 || typedCheckpoint.nextEndpoint !== '';

        if (!isResuming) {
            await nango.trackDeletesStart('FolderChild');
        }

        for (let i = typedCheckpoint.folderIndex; i < folderIds.length; i++) {
            const folderId = folderIds[i];
            if (!folderId) {
                if (i < folderIds.length - 1) {
                    await nango.saveCheckpoint({
                        folderIndex: i + 1,
                        nextEndpoint: ''
                    });
                }
                continue;
            }

            const baseEndpoint = `/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children`;
            const initialEndpoint = i === typedCheckpoint.folderIndex && typedCheckpoint.nextEndpoint ? typedCheckpoint.nextEndpoint : baseEndpoint;
            let nextEndpoint = '';
            let sawPage = false;

            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/driveitem-list-children
                endpoint: initialEndpoint,
                ...(initialEndpoint === baseEndpoint ? { params: { $top: 100 } } : {}),
                retries: 3,
                paginate: {
                    type: 'link',
                    response_path: 'value',
                    link_path_in_response_body: '@odata.nextLink',
                    on_page: async ({ response }) => {
                        const rawNextLink = response.data?.['@odata.nextLink'];
                        nextEndpoint = normalizeGraphEndpoint(typeof rawNextLink === 'string' ? rawNextLink : undefined);
                    }
                }
            };

            for await (const page of nango.paginate(proxyConfig)) {
                sawPage = true;
                const records: FolderChild[] = [];

                for (const rawItem of page) {
                    const parseResult = DriveItemSchema.safeParse(rawItem);
                    if (!parseResult.success) {
                        throw new Error(`Failed to parse drive item: ${JSON.stringify(parseResult.error)}`);
                    }

                    const item = parseResult.data;
                    const mapped: FolderChild = {
                        id: item.id,
                        folderId: folderId,
                        name: item.name,
                        size: item.size,
                        webUrl: item.webUrl,
                        downloadUrl: item.downloadUrl,
                        createdDateTime: item.createdDateTime,
                        lastModifiedDateTime: item.lastModifiedDateTime,
                        driveId: item.parentReference?.driveId,
                        parentPath: item.parentReference?.path,
                        isFolder: item.folder !== undefined,
                        mimeType: item.file?.mimeType
                    };

                    records.push(mapped);
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'FolderChild');
                }

                if (nextEndpoint) {
                    await nango.saveCheckpoint({
                        folderIndex: i,
                        nextEndpoint
                    });
                } else if (i < folderIds.length - 1) {
                    await nango.saveCheckpoint({
                        folderIndex: i + 1,
                        nextEndpoint: ''
                    });
                }
            }

            if (!sawPage && i < folderIds.length - 1) {
                await nango.saveCheckpoint({
                    folderIndex: i + 1,
                    nextEndpoint: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FolderChild');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
