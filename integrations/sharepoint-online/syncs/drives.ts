import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
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

const sync = createSync({
    description: 'Sync document libraries for selected sites',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Drive: DriveSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/drives' }],

    exec: async (nango) => {
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

        for (const siteId of siteIds) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-list-drives
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drives`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const drives: DriveOutput[] = [];

                for (const rawDrive of page) {
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
            }
        }

        await nango.trackDeletesEnd('Drive');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
