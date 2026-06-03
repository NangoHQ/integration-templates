import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    sharedSites: z.array(z.string()).optional(),
    pickedFiles: z
        .array(
            z.object({
                driveId: z.string(),
                id: z.string()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    file_etags_json: z.string()
});

const FileEtagsSchema = z.record(z.string(), z.string());

const DriveSchema = z.object({
    id: z.string()
});

const DrivesResponseSchema = z.object({
    value: z.array(DriveSchema)
});

const DriveDeltaItemSchema = z
    .object({
        id: z.string(),
        file: z.object({}).optional(),
        deleted: z.record(z.string(), z.unknown()).optional(),
        '@removed': z.object({}).optional()
    })
    .passthrough();

const DriveDeltaResponseSchema = z.object({
    value: z.array(DriveDeltaItemSchema)
});

const DriveItemResponseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    createdDateTime: z.string().optional(),
    eTag: z.string().optional(),
    cTag: z.string().optional(),
    parentReference: z
        .object({
            driveId: z.string(),
            id: z.string(),
            path: z.string().optional()
        })
        .optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional()
});

const UserFileSelectionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    createdDateTime: z.string().optional(),
    driveId: z.string(),
    mimeType: z.string().optional(),
    parentReference: z
        .object({
            driveId: z.string(),
            id: z.string(),
            path: z.string().optional()
        })
        .optional()
});

type PickedFile = NonNullable<z.infer<typeof MetadataSchema>['pickedFiles']>[number];

function createSelectionKey(driveId: string, itemId: string): string {
    return `${driveId}|${itemId}`;
}

function getItemIdFromSelectionKey(selectionKey: string): string {
    return selectionKey.slice(selectionKey.indexOf('|') + 1);
}

function parseFileEtags(input: string | undefined): Record<string, string> {
    if (!input) {
        return {};
    }

    try {
        const parsed = JSON.parse(input);
        const result = FileEtagsSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and refetch the selected files.
    }

    return {};
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

async function buildDryRunMetadata(nango: NangoSyncLocal): Promise<z.infer<typeof MetadataSchema>> {
    const drivesResponse = await nango.get({
        // https://learn.microsoft.com/graph/api/drive-list
        endpoint: '/v1.0/me/drives',
        retries: 3
    });

    const drives = DrivesResponseSchema.parse(drivesResponse.data).value;

    for (const drive of drives) {
        const deltaResponse = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-delta
            endpoint: `/v1.0/drives/${encodeURIComponent(drive.id)}/root/delta?$top=100`,
            retries: 3
        });

        if (deltaResponse.status < 200 || deltaResponse.status >= 300) {
            throw new Error(`Failed to discover files for dryrun metadata in drive ${drive.id}: ${deltaResponse.status}`);
        }

        const items = DriveDeltaResponseSchema.parse(deltaResponse.data).value;
        const firstFile = items.find((item) => item.file && !item.deleted && !item['@removed']);
        if (firstFile) {
            return {
                sharedSites: ['root'],
                pickedFiles: [
                    {
                        driveId: drive.id,
                        id: firstFile.id
                    }
                ]
            };
        }
    }

    return {
        sharedSites: ['root'],
        pickedFiles: []
    };
}

const sync = createSync({
    description: 'Sync selected user files from SharePoint.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        UserFileSelection: UserFileSelectionSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/user-files-selection'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await getMetadataOrNull(nango);
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        const metadata = metadataResult.success
            ? metadataResult.data
            : (isDryRun(nango) || isLocalFixtureMock(nango)) && rawMetadata == null
              ? await buildDryRunMetadata(nango)
              : undefined;
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const previousFileEtags = parseFileEtags(checkpoint.success ? checkpoint.data.file_etags_json : undefined);

        if (!metadata?.sharedSites || metadata.sharedSites.length === 0) {
            throw new Error('sharedSites is required in metadata');
        }

        const pickedFiles = metadata.pickedFiles ?? [];
        const selectedFilesByKey = new Map<string, PickedFile>();
        for (const file of pickedFiles) {
            selectedFilesByKey.set(createSelectionKey(file.driveId, file.id), file);
        }

        if (selectedFilesByKey.size === 0) {
            const staleRecords = Object.keys(previousFileEtags).map((selectionKey) => ({
                id: getItemIdFromSelectionKey(selectionKey)
            }));

            if (staleRecords.length > 0) {
                await nango.batchDelete(staleRecords, 'UserFileSelection');
            }

            await nango.saveCheckpoint({ file_etags_json: '{}' });
            return;
        }

        const nextFileEtags: Record<string, string> = {};
        const deletions = new Map<string, { id: string }>();

        for (const selectionKey of Object.keys(previousFileEtags)) {
            if (!selectedFilesByKey.has(selectionKey)) {
                deletions.set(getItemIdFromSelectionKey(selectionKey), {
                    id: getItemIdFromSelectionKey(selectionKey)
                });
            }
        }

        for (const [selectionKey, file] of selectedFilesByKey.entries()) {
            const previousEtag = previousFileEtags[selectionKey];

            // https://learn.microsoft.com/graph/api/driveitem-get
            const response = await nango.get({
                endpoint: `/v1.0/drives/${encodeURIComponent(file.driveId)}/items/${encodeURIComponent(file.id)}`,
                ...(previousEtag
                    ? {
                          headers: {
                              'If-None-Match': previousEtag
                          }
                      }
                    : {}),
                retries: 3
            });

            if (response.status === 304) {
                nextFileEtags[selectionKey] = previousEtag ?? '';
                continue;
            }

            if (response.status === 404) {
                deletions.set(file.id, { id: file.id });
                continue;
            }

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Failed to fetch selected file ${file.id}: ${response.status}`);
            }

            const parseResult = DriveItemResponseSchema.safeParse(response.data);
            if (!parseResult.success) {
                throw new Error(`Failed to parse drive item for file ${file.id}: ${parseResult.error.message}`);
            }

            const item = parseResult.data;

            await nango.batchSave(
                [
                    {
                        id: item.id,
                        driveId: file.driveId,
                        ...(item.name != null && { name: item.name }),
                        ...(item.webUrl != null && { webUrl: item.webUrl }),
                        ...(item.size != null && { size: item.size }),
                        ...(item.lastModifiedDateTime != null && { lastModifiedDateTime: item.lastModifiedDateTime }),
                        ...(item.createdDateTime != null && { createdDateTime: item.createdDateTime }),
                        ...(item.file?.mimeType != null && { mimeType: item.file.mimeType }),
                        ...(item.parentReference != null && {
                            parentReference: {
                                driveId: item.parentReference.driveId,
                                id: item.parentReference.id,
                                ...(item.parentReference.path != null && { path: item.parentReference.path })
                            }
                        })
                    }
                ],
                'UserFileSelection'
            );

            nextFileEtags[selectionKey] = item.eTag ?? item.cTag ?? '';
        }

        if (deletions.size > 0) {
            await nango.batchDelete(Array.from(deletions.values()), 'UserFileSelection');
        }

        await nango.saveCheckpoint({
            file_etags_json: JSON.stringify(nextFileEtags)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
