import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    siteIds: z.array(z.string()).optional(),
    sitePaths: z.array(z.string()).optional(),
    searchTerms: z.array(z.string()).optional()
});

const GraphSiteSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    siteCollection: z
        .object({
            hostname: z.string().optional()
        })
        .optional()
});

const SiteSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    siteCollectionHostname: z.string().optional()
});

const sync = createSync({
    description: 'Sync targeted SharePoint sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Site: SiteSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sites'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const metadata = metadataResult.data;
        const siteIds = metadata.siteIds ?? [];
        const sitePaths = metadata.sitePaths ?? [];
        const searchTerms = metadata.searchTerms ?? [];

        if (siteIds.length === 0 && sitePaths.length === 0 && searchTerms.length === 0) {
            throw new Error('At least one of siteIds, sitePaths, or searchTerms must be provided in metadata.');
        }

        const siteMap = new Map<string, z.infer<typeof SiteSchema>>();

        for (const siteId of siteIds) {
            // https://learn.microsoft.com/graph/api/site-get
            const response = await nango.get({
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}`,
                retries: 3
            });

            const parsed = GraphSiteSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse site response for ID ${siteId}: ${parsed.error.message}`);
            }

            const site = parsed.data;
            siteMap.set(site.id, {
                id: site.id,
                ...(site.displayName != null && { displayName: site.displayName }),
                ...(site.name != null && { name: site.name }),
                ...(site.webUrl != null && { webUrl: site.webUrl }),
                ...(site.description != null && { description: site.description }),
                ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
            });
        }

        for (const sitePath of sitePaths) {
            // https://learn.microsoft.com/graph/api/site-get
            const response = await nango.get({
                endpoint: `/v1.0/sites/${encodeURIComponent(sitePath)}`,
                retries: 3
            });

            const parsed = GraphSiteSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse site response for path ${sitePath}: ${parsed.error.message}`);
            }

            const site = parsed.data;
            siteMap.set(site.id, {
                id: site.id,
                ...(site.displayName != null && { displayName: site.displayName }),
                ...(site.name != null && { name: site.name }),
                ...(site.webUrl != null && { webUrl: site.webUrl }),
                ...(site.description != null && { description: site.description }),
                ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
            });
        }

        for (const term of searchTerms) {
            // https://learn.microsoft.com/graph/api/site-search
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-search
                endpoint: '/v1.0/sites',
                params: {
                    search: term
                },
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
                for (const raw of page) {
                    const searchItem = GraphSiteSchema.safeParse(raw);
                    if (!searchItem.success) {
                        throw new Error(`Failed to parse site search result for term ${term}: ${searchItem.error.message}`);
                    }

                    const result = searchItem.data;
                    if (!result.id) {
                        continue;
                    }

                    // https://learn.microsoft.com/graph/api/site-get
                    const detailResponse = await nango.get({
                        endpoint: `/v1.0/sites/${encodeURIComponent(result.id)}`,
                        retries: 3
                    });

                    const detailParsed = GraphSiteSchema.safeParse(detailResponse.data);
                    if (!detailParsed.success) {
                        throw new Error(`Failed to parse site detail response for ID ${result.id}: ${detailParsed.error.message}`);
                    }

                    const site = detailParsed.data;
                    siteMap.set(site.id, {
                        id: site.id,
                        ...(site.displayName != null && { displayName: site.displayName }),
                        ...(site.name != null && { name: site.name }),
                        ...(site.webUrl != null && { webUrl: site.webUrl }),
                        ...(site.description != null && { description: site.description }),
                        ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                        ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                        ...(site.siteCollection?.hostname != null && { siteCollectionHostname: site.siteCollection.hostname })
                    });
                }
            }
        }

        const sites = Array.from(siteMap.values());

        await nango.trackDeletesStart('Site');

        if (sites.length > 0) {
            await nango.batchSave(sites, 'Site');
        }

        await nango.trackDeletesEnd('Site');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
