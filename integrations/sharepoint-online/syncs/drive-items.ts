import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    driveIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    deltaLinksJson: z.string()
});

const GraphDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            driveId: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z.object({}).optional(),
    file: z.object({}).optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const DeltaResponseSchema = z
    .object({
        value: z.array(z.unknown()).optional(),
        '@odata.nextLink': z.string().optional(),
        '@odata.deltaLink': z.string().optional()
    })
    .passthrough();

const DriveItemSchema = z.object({
    id: z.string(),
    driveId: z.string(),
    name: z.string().optional(),
    parentId: z.string().optional(),
    path: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z.boolean().optional(),
    file: z.boolean().optional()
});

type DriveItem = z.infer<typeof DriveItemSchema>;

const sync = createSync({
    description: 'Sync files and folders from selected site drives',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/drive-items'
        }
    ],
    models: {
        DriveItem: DriveItemSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();

        let driveIds: string[];
        if (metadata?.driveIds && metadata.driveIds.length > 0) {
            driveIds = metadata.driveIds;
        } else {
            // https://learn.microsoft.com/graph/api/site-list-drives
            const drivesResponse = await nango.get({
                endpoint: '/v1.0/sites/root/drives',
                retries: 3
            });
            const drives = z.object({ value: z.array(z.object({ id: z.string() })) }).parse(drivesResponse.data);
            driveIds = drives.value.map((drive) => drive.id);
            if (driveIds.length === 0) {
                throw new Error('No drives found for the root site');
            }
        }

        const deltaLinks: Record<string, string> = {};
        if (checkpoint != null) {
            const raw = JSON.parse(checkpoint.deltaLinksJson);
            if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
                throw new Error('Invalid checkpoint deltaLinksJson');
            }
            for (const key of Object.keys(raw)) {
                const value = raw[key];
                if (typeof value !== 'string') {
                    throw new Error(`Invalid checkpoint deltaLinksJson value for key ${key}`);
                }
                deltaLinks[key] = value;
            }
        }

        for (const driveId of driveIds) {
            let nextDeltaLink: string | undefined;

            let endpoint: string;
            let baseUrlOverride: string | undefined;

            const savedDeltaLink = deltaLinks[driveId];
            if (savedDeltaLink) {
                const url = new URL(savedDeltaLink);
                baseUrlOverride = url.origin;
                endpoint = url.pathname + url.search;
            } else {
                endpoint = `/v1.0/drives/${encodeURIComponent(driveId)}/root/delta`;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/driveitem-delta
                endpoint,
                baseUrlOverride,
                params: {
                    $top: 100
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 100,
                    on_page: async ({ response }) => {
                        const parsed = DeltaResponseSchema.parse(response.data);
                        if (parsed['@odata.deltaLink']) {
                            nextDeltaLink = parsed['@odata.deltaLink'];
                        }
                    }
                },
                retries: 3
            };

            for await (const batch of nango.paginate<unknown>(proxyConfig)) {
                const items = z.array(GraphDriveItemSchema).parse(batch);

                const upserts: DriveItem[] = [];
                const deletions: Array<{ id: string }> = [];

                for (const item of items) {
                    const compositeId = `${driveId}/${item.id}`;
                    if (item['@removed'] != null) {
                        deletions.push({ id: compositeId });
                    } else {
                        upserts.push({
                            id: compositeId,
                            driveId,
                            name: item.name,
                            parentId: item.parentReference?.id,
                            path: item.parentReference?.path,
                            size: item.size,
                            webUrl: item.webUrl,
                            createdDateTime: item.createdDateTime,
                            lastModifiedDateTime: item.lastModifiedDateTime,
                            folder: item.folder !== undefined,
                            file: item.file !== undefined
                        });
                    }
                }

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'DriveItem');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'DriveItem');
                }
            }

            if (nextDeltaLink) {
                deltaLinks[driveId] = nextDeltaLink;
                await nango.saveCheckpoint({ deltaLinksJson: JSON.stringify(deltaLinks) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
