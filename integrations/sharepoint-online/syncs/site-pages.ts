import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    selectedSites: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    site_updated_after: z.string()
});

const ProviderSitePageSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    publishingState: z
        .object({
            level: z.string().optional()
        })
        .optional()
});

const SitePageSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    publishingState: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const SiteUpdatedAfterSchema = z.record(z.string(), z.string());

function parseSiteUpdatedAfter(input: string): Record<string, string> {
    // @allowTryCatch JSON.parse may throw on malformed checkpoint data;
    //                 falling back to an empty map avoids a hard sync failure.
    try {
        const parsed = JSON.parse(input);
        const result = SiteUpdatedAfterSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // ignore
    }
    return {};
}

const sync = createSync({
    description: 'Sync modern site pages for selected sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    scopes: ['Sites.Read.All', 'offline_access'],
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/site-pages'
        }
    ],
    models: {
        SitePage: SitePageSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Invalid metadata: selectedSites must be an array of strings');
        }

        const selectedSites = parsedMetadata.data.selectedSites;
        if (!selectedSites || selectedSites.length === 0) {
            throw new Error('No selected sites found in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const siteUpdatedAfter = parseSiteUpdatedAfter(parsedCheckpoint.success ? parsedCheckpoint.data.site_updated_after : '{}');

        for (const siteId of selectedSites) {
            const updatedAfter = siteUpdatedAfter[siteId];

            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/sitepage-list
                endpoint: `v1.0/sites/${encodeURIComponent(siteId)}/pages/microsoft.graph.sitePage`,
                params: {
                    $select: 'id,title,publishingState,lastModifiedDateTime',
                    $orderBy: 'lastModifiedDateTime asc',
                    ...(updatedAfter ? { $filter: `lastModifiedDateTime ge ${updatedAfter}` } : {})
                },
                paginate: {
                    type: 'link',
                    limit_name_in_request: '$top',
                    response_path: 'value',
                    link_path_in_response_body: '@odata.nextLink',
                    limit: 100
                },
                retries: 3
            };

            let lastModified: string | undefined;

            for await (const page of nango.paginate(proxyConfig)) {
                if (!Array.isArray(page)) {
                    continue;
                }

                const records: Array<{
                    id: string;
                    title?: string;
                    publishingState?: string;
                    lastModifiedDateTime?: string;
                }> = [];

                for (const raw of page) {
                    const parsed = ProviderSitePageSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse site page for site ${siteId}: ${parsed.error.message}`);
                    }

                    const record = parsed.data;
                    records.push({
                        id: record.id,
                        ...(record.title != null && { title: record.title }),
                        ...(record.publishingState?.level != null && {
                            publishingState: record.publishingState.level
                        }),
                        ...(record.lastModifiedDateTime != null && {
                            lastModifiedDateTime: record.lastModifiedDateTime
                        })
                    });

                    if (record.lastModifiedDateTime) {
                        lastModified = record.lastModifiedDateTime;
                    }
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'SitePage');
                }

                if (lastModified) {
                    siteUpdatedAfter[siteId] = lastModified;
                    await nango.saveCheckpoint({
                        site_updated_after: JSON.stringify(siteUpdatedAfter)
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
