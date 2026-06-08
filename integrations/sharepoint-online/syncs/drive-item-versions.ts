import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    drives: z
        .array(
            z.object({
                siteId: z.string(),
                driveId: z.string()
            })
        )
        .optional()
});

const DriveItemVersionSchema = z.object({
    id: z.string(),
    itemId: z.string(),
    driveId: z.string(),
    siteId: z.string(),
    versionId: z.string(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    lastModifiedByDisplayName: z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLinksJson: z.string()
});

const SiteSchema = z.object({
    id: z.string()
});

const DriveSchema = z.object({
    id: z.string()
});

const DeltaItemSchema = z.object({
    id: z.string(),
    folder: z.object({}).optional(),
    '@removed': z.object({ reason: z.string().optional() }).optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(DeltaItemSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const SitesResponseSchema = z.object({
    value: z.array(SiteSchema)
});

const DrivesResponseSchema = z.object({
    value: z.array(DriveSchema)
});

const VersionItemSchema = z.object({
    id: z.string(),
    size: z.number().optional().nullable(),
    lastModifiedDateTime: z.string().optional().nullable(),
    lastModifiedBy: z
        .object({
            user: z
                .object({
                    displayName: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable()
});

const sync = createSync({
    description: 'Sync version history for drive items in configured site drives',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        DriveItemVersion: DriveItemVersionSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/drive-item-versions'
        }
    ],
    scopes: ['Sites.Read.All', 'Files.Read.All'],
    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.parse(metadataRaw ?? {});

        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw ? CheckpointSchema.parse(checkpointRaw) : { deltaLinksJson: '' };

        let drives = metadata.drives;
        if (!drives || drives.length === 0) {
            drives = await discoverDrives(nango);
        }

        if (!drives || drives.length === 0) {
            throw new Error('No drives found. Configure drives in metadata or ensure the connection has access to SharePoint sites.');
        }

        const deltaLinks: Record<string, string> = checkpoint.deltaLinksJson ? JSON.parse(checkpoint.deltaLinksJson) : {};

        for (const drive of drives) {
            const driveKey = `${drive.siteId}:${drive.driveId}`;
            const existingDeltaLink = deltaLinks[driveKey];

            let nextUrl: string | undefined = existingDeltaLink;

            if (!nextUrl) {
                nextUrl = `/v1.0/sites/${encodeURIComponent(drive.siteId)}/drives/${encodeURIComponent(drive.driveId)}/items/root/delta?$top=100`;
            } else if (nextUrl.startsWith('http')) {
                const parsed = new URL(nextUrl);
                nextUrl = parsed.pathname + parsed.search;
            }

            let lastDeltaLink: string | undefined;

            while (nextUrl) {
                const response = await nango.get({
                    // https://learn.microsoft.com/graph/api/driveitem-delta
                    endpoint: nextUrl,
                    retries: 3
                });

                const deltaData = DeltaResponseSchema.parse(response.data);
                const items = deltaData.value;
                const versionsToSave: Array<z.infer<typeof DriveItemVersionSchema>> = [];

                for (const item of items) {
                    if (item['@removed']) {
                        continue;
                    }

                    if (item.folder) {
                        continue;
                    }

                    const itemVersions = await fetchVersionsForItem(nango, drive.siteId, drive.driveId, item.id);
                    versionsToSave.push(...itemVersions);
                }

                if (versionsToSave.length > 0) {
                    await nango.batchSave(versionsToSave, 'DriveItemVersion');
                }

                if (typeof deltaData['@odata.deltaLink'] === 'string') {
                    lastDeltaLink = deltaData['@odata.deltaLink'];
                }

                if (typeof deltaData['@odata.nextLink'] === 'string') {
                    const parsedNext = new URL(deltaData['@odata.nextLink']);
                    nextUrl = parsedNext.pathname + parsedNext.search;
                } else {
                    nextUrl = undefined;
                }
            }

            if (lastDeltaLink) {
                deltaLinks[driveKey] = lastDeltaLink;
            }

            await nango.saveCheckpoint({ deltaLinksJson: JSON.stringify(deltaLinks) });
        }
    }
});

async function discoverDrives(nango: NangoSyncLocal) {
    const drives: Array<{ siteId: string; driveId: string }> = [];

    const sitesResponse = await nango.get({
        // https://learn.microsoft.com/graph/api/site-search
        endpoint: '/v1.0/sites',
        params: {
            search: '*'
        },
        retries: 3
    });

    const sitesData = SitesResponseSchema.parse(sitesResponse.data);
    const sites = sitesData.value;

    for (const site of sites) {
        const drivesResponse = await nango.get({
            // https://learn.microsoft.com/graph/api/drive-list
            endpoint: `/v1.0/sites/${encodeURIComponent(site.id)}/drives`,
            retries: 3
        });

        const drivesData = DrivesResponseSchema.parse(drivesResponse.data);
        const siteDrives = drivesData.value;

        for (const drive of siteDrives) {
            drives.push({ siteId: site.id, driveId: drive.id });
        }
    }

    return drives;
}

async function fetchVersionsForItem(
    nango: NangoSyncLocal,
    siteId: string,
    driveId: string,
    itemId: string
): Promise<Array<z.infer<typeof DriveItemVersionSchema>>> {
    const versions: Array<z.infer<typeof DriveItemVersionSchema>> = [];

    // https://learn.microsoft.com/graph/api/driveitem-list-versions
    for await (const page of nango.paginate({
        endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/versions`,
        paginate: {
            type: 'link',
            link_path_in_response_body: '@odata.nextLink',
            response_path: 'value',
            limit: 100,
            limit_name_in_request: '$top'
        },
        retries: 3
    })) {
        const versionItems = z.array(VersionItemSchema).parse(page);
        for (const version of versionItems) {
            versions.push({
                id: `${itemId}:${version.id}`,
                itemId,
                driveId,
                siteId,
                versionId: version.id,
                ...(version.size != null && { size: version.size }),
                ...(version.lastModifiedDateTime && { lastModifiedDateTime: version.lastModifiedDateTime }),
                ...(version.lastModifiedBy?.user?.displayName && { lastModifiedByDisplayName: version.lastModifiedBy.user.displayName })
            });
        }
    }

    return versions;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
