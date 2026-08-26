import { createSync } from 'nango';
import { z } from 'zod';

const DriveSchema = z.object({
    id: z.string(),
    siteId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const MetadataSchema = z.object({
    siteIds: z.array(z.string()).optional()
});

const SiteListResponseSchema = z.object({
    value: z
        .array(
            z
                .object({
                    id: z.string()
                })
                .passthrough()
        )
        .optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    driveType: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const DrivesResponseSchema = z.object({
    value: z.array(z.unknown()).optional(),
    '@odata.nextLink': z.string().optional()
});

const DrivesCheckpointDataSchema = z.object({
    siteIndex: z.number().int().nonnegative().optional(),
    nextLink: z.string().optional()
});

const CheckpointSchema = z.object({
    drives_checkpoint_json: z.string()
});

interface DriveOutput {
    [key: string]: unknown;
    id: string;
    siteId: string;
    name?: string;
    description?: string;
    driveType?: string;
    webUrl?: string;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
}

function parseDrivesCheckpoint(input: string | undefined): z.infer<typeof DrivesCheckpointDataSchema> {
    if (!input) {
        return {};
    }

    try {
        const parsed = JSON.parse(input);
        const result = DrivesCheckpointDataSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and restart from the beginning.
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

const sync = createSync({
    description: 'Sync document libraries for selected sites',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Drive: DriveSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/drives' }],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const drivesCheckpoint = parseDrivesCheckpoint(checkpointResult.success ? checkpointResult.data.drives_checkpoint_json : '{}');

        const metadata = await nango.getMetadata();
        const metadataParse = MetadataSchema.safeParse(metadata ?? {});
        if (!metadataParse.success) {
            throw new Error(`Invalid metadata: ${metadataParse.error.message}`);
        }

        let siteIds = metadataParse.data.siteIds ?? [];
        if (siteIds.length === 0) {
            const followedSitesResponse = await nango.get({
                // https://learn.microsoft.com/graph/api/sites-list-followed
                endpoint: '/v1.0/me/followedSites',
                retries: 3
            });

            const followedSitesParse = SiteListResponseSchema.safeParse(followedSitesResponse.data);
            if (!followedSitesParse.success) {
                throw new Error(`Failed to parse followed sites: ${followedSitesParse.error.message}`);
            }

            siteIds = (followedSitesParse.data.value ?? []).map((site) => site.id);
        }

        if (siteIds.length === 0) {
            return;
        }

        await nango.trackDeletesStart('Drive');

        const siteIndex = drivesCheckpoint.siteIndex ?? 0;
        let resumeNextLink = drivesCheckpoint.nextLink;

        for (let i = siteIndex; i < siteIds.length; i++) {
            const siteId = siteIds[i]!;
            let nextEndpoint: string | undefined = resumeNextLink ? toRelativeUrl(resumeNextLink) : `/v1.0/sites/${encodeURIComponent(siteId)}/drives?$top=100`;

            // Clear resume state after first use so subsequent sites start from the beginning.
            resumeNextLink = undefined;

            while (nextEndpoint) {
                const response = await nango.get({
                    // https://learn.microsoft.com/graph/api/site-list-drives
                    endpoint: nextEndpoint,
                    retries: 3
                });

                const drivesParse = DrivesResponseSchema.safeParse(response.data);
                if (!drivesParse.success) {
                    throw new Error(`Failed to parse drives response: ${drivesParse.error.message}`);
                }

                const drives: DriveOutput[] = [];

                for (const rawDrive of drivesParse.data.value ?? []) {
                    const driveParse = DriveItemSchema.safeParse(rawDrive);
                    if (!driveParse.success) {
                        throw new Error(`Failed to parse drive: ${driveParse.error.message}`);
                    }

                    const drive = driveParse.data;
                    drives.push({
                        id: drive.id,
                        siteId,
                        ...(drive.name != null && { name: drive.name }),
                        ...(drive.description != null && { description: drive.description }),
                        ...(drive.driveType != null && { driveType: drive.driveType }),
                        ...(drive.webUrl != null && { webUrl: drive.webUrl }),
                        ...(drive.createdDateTime != null && { createdDateTime: drive.createdDateTime }),
                        ...(drive.lastModifiedDateTime != null && { lastModifiedDateTime: drive.lastModifiedDateTime })
                    });
                }

                if (drives.length > 0) {
                    await nango.batchSave(drives, 'Drive');
                }

                const nextLink = drivesParse.data['@odata.nextLink'];
                if (typeof nextLink === 'string') {
                    nextEndpoint = toRelativeUrl(nextLink);
                    await nango.saveCheckpoint({
                        drives_checkpoint_json: JSON.stringify({ siteIndex: i, nextLink })
                    });
                } else {
                    nextEndpoint = undefined;
                    if (i + 1 < siteIds.length) {
                        await nango.saveCheckpoint({
                            drives_checkpoint_json: JSON.stringify({ siteIndex: i + 1 })
                        });
                    }
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Drive');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
