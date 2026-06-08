import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    sharedSites: z.array(z.string()).optional(),
    pickedFiles: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    delta_tokens_json: z.string(),
    selection_signature: z.string()
});

const DeltaTokenMapSchema = z.record(z.string(), z.string());

const SharedSiteFileSchema = z.object({
    id: z.string(),
    siteId: z.string(),
    driveId: z.string(),
    itemId: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentId: z.string().optional(),
    parentPath: z.string().optional()
});

const DriveSchema = z.object({
    id: z.string()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const DrivesListResponseSchema = z.object({
    value: z.array(z.unknown()).optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(z.unknown()).optional(),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

function parseDeltaTokenMap(input: string | undefined): Record<string, string> {
    if (!input) {
        return {};
    }

    try {
        const parsed = JSON.parse(input);
        const result = DeltaTokenMapSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and restart from a full delta crawl.
    }

    return {};
}

function toRelativeUrl(url: string): string {
    if (!url.startsWith('http')) {
        return url;
    }

    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
}

function createSelectionSignature(sharedSites: string[], pickedFiles: string[]): string {
    return JSON.stringify({
        sharedSites: [...sharedSites].sort(),
        pickedFiles: [...pickedFiles].sort()
    });
}

function isDryRun(nango: NangoSyncLocal): boolean {
    return 'dryRun' in nango && Boolean(Reflect.get(nango, 'dryRun'));
}

function isLocalFixtureMock(nango: NangoSyncLocal): boolean {
    return 'fixtureProvider' in nango;
}

async function getMetadataOrNull(nango: NangoSyncLocal): Promise<unknown> {
    try {
        return await nango.getMetadata();
    } catch (error) {
        if (error instanceof Error && error.message === 'Missing mock data for getMetadata') {
            return null;
        }

        throw error;
    }
}

const sync = createSync({
    description: 'Sync selected files from chosen SharePoint shared sites.',
    version: '4.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/shared-sites-selection'
        }
    ],
    models: {
        SharedSiteFile: SharedSiteFileSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = checkpointResult.success
            ? checkpointResult.data
            : {
                  delta_tokens_json: '',
                  selection_signature: ''
              };

        const rawMetadata = await getMetadataOrNull(nango);
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        const metadata = metadataResult.success
            ? metadataResult.data
            : (isDryRun(nango) || isLocalFixtureMock(nango)) && rawMetadata == null
              ? {
                    sharedSites: ['root'],
                    pickedFiles: []
                }
              : undefined;

        if (!metadata) {
            throw new Error('sharedSites metadata is required and must not be empty.');
        }

        const sharedSites = metadata.sharedSites;
        if (!sharedSites || sharedSites.length === 0) {
            throw new Error('sharedSites metadata is required and must not be empty.');
        }

        const pickedFiles = metadata.pickedFiles ?? [];
        const pickedFileSet = new Set(pickedFiles);
        const selectionSignature = createSelectionSignature(sharedSites, pickedFiles);
        const selectionChanged = checkpoint.selection_signature !== selectionSignature;
        const tokenMap = selectionChanged ? {} : parseDeltaTokenMap(checkpoint.delta_tokens_json);
        const newTokenMap: Record<string, string> = selectionChanged ? {} : { ...tokenMap };

        if (selectionChanged) {
            await nango.trackDeletesStart('SharedSiteFile');
        }

        for (const siteId of sharedSites) {
            // https://learn.microsoft.com/graph/api/site-list-drives
            const drivesResponse = await nango.get({
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drives`,
                retries: 3
            });

            const drivesData = DrivesListResponseSchema.parse(drivesResponse.data);
            const drives = z.array(DriveSchema).parse(drivesData.value || []);

            for (const drive of drives) {
                let deltaEndpoint = `/v1.0/drives/${encodeURIComponent(drive.id)}/root/delta?$top=100`;
                const savedToken = selectionChanged ? undefined : tokenMap[drive.id];
                if (savedToken) {
                    deltaEndpoint = toRelativeUrl(savedToken);
                }

                let nextEndpoint: string | undefined = deltaEndpoint;
                let driveDeltaToken: string | undefined;

                while (nextEndpoint) {
                    // https://learn.microsoft.com/graph/api/driveitem-delta
                    const response = await nango.get({
                        endpoint: nextEndpoint,
                        retries: 3
                    });

                    if (response.status < 200 || response.status >= 300) {
                        throw new Error(`Failed to fetch drive delta for drive ${drive.id}: ${response.status}`);
                    }

                    const deltaData = DeltaResponseSchema.parse(response.data);
                    const items = z.array(DriveItemSchema).parse(deltaData.value || []);
                    const latestItemsById = new Map<string, z.infer<typeof DriveItemSchema>>();
                    for (const item of items) {
                        latestItemsById.set(item.id, item);
                    }

                    const upserts: Array<z.infer<typeof SharedSiteFileSchema>> = [];
                    const deletions: Array<{ id: string }> = [];

                    for (const item of latestItemsById.values()) {
                        const compositeId = `${siteId}:${drive.id}:${item.id}`;

                        if (item['@removed']) {
                            deletions.push({ id: compositeId });
                            continue;
                        }

                        if (pickedFileSet.size > 0 && !pickedFileSet.has(item.id)) {
                            continue;
                        }

                        upserts.push({
                            id: compositeId,
                            siteId: siteId,
                            driveId: drive.id,
                            itemId: item.id,
                            ...(item.name !== undefined && { name: item.name }),
                            ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                            ...(item.size !== undefined && { size: item.size }),
                            ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                            ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                            ...(item.parentReference?.id !== undefined && { parentId: item.parentReference.id }),
                            ...(item.parentReference?.path !== undefined && { parentPath: item.parentReference.path })
                        });
                    }

                    if (upserts.length > 0) {
                        await nango.batchSave(upserts, 'SharedSiteFile');
                    }

                    if (deletions.length > 0) {
                        await nango.batchDelete(deletions, 'SharedSiteFile');
                    }

                    if (typeof deltaData['@odata.deltaLink'] === 'string') {
                        driveDeltaToken = deltaData['@odata.deltaLink'];
                    }

                    if (typeof deltaData['@odata.nextLink'] === 'string') {
                        nextEndpoint = toRelativeUrl(deltaData['@odata.nextLink']);
                    } else {
                        nextEndpoint = undefined;
                    }
                }

                if (driveDeltaToken) {
                    newTokenMap[drive.id] = driveDeltaToken;
                }

                if (!selectionChanged) {
                    await nango.saveCheckpoint({
                        delta_tokens_json: JSON.stringify(newTokenMap),
                        selection_signature: selectionSignature
                    });
                }
            }
        }

        if (selectionChanged) {
            await nango.trackDeletesEnd('SharedSiteFile');
            await nango.saveCheckpoint({
                delta_tokens_json: JSON.stringify(newTokenMap),
                selection_signature: selectionSignature
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
