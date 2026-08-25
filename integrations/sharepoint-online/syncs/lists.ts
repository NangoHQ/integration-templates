import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    site_ids: z.array(z.string()).optional()
});

const SiteSchema = z.object({
    id: z.string()
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    list: z
        .object({
            template: z.string().optional(),
            contentTypesEnabled: z.boolean().optional(),
            hidden: z.boolean().optional()
        })
        .optional(),
    parentReference: z.object({
        siteId: z.string()
    })
});

const ListSchema = z.object({
    id: z.string(),
    site_id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    list_template: z.string().optional(),
    contentTypesEnabled: z.boolean().optional(),
    hidden: z.boolean().optional()
});

const SitesResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const ListsResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    siteNextLink: z.string(),
    siteIdsJson: z.string(),
    siteIndex: z.number().int().nonnegative(),
    listNextLink: z.string()
});

function toRelativeUrl(url: string): string {
    if (!url.startsWith('http')) {
        return url;
    }

    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
}

function parseSiteIdsJson(input: string): string[] | undefined {
    // @allowTryCatch JSON.parse may throw on malformed checkpoint data;
    //                 undefined tells the caller to restart site discovery.
    try {
        const parsed = JSON.parse(input);
        const result = z.array(z.string()).safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // ignore
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync SharePoint lists for selected sites.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        List: ListSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/lists'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const cp = parsedCheckpoint.success ? parsedCheckpoint.data : { siteNextLink: '', siteIdsJson: '[]', siteIndex: 0, listNextLink: '' };

        const metadata = await nango.getMetadata();

        let siteIds: string[] = [];
        let siteIndex = cp.siteIndex;
        let listNextLink = cp.listNextLink;
        const checkpointSiteIds = parseSiteIdsJson(cp.siteIdsJson);

        if (metadata?.site_ids !== undefined && metadata.site_ids.length > 0) {
            for (const siteId of metadata.site_ids) {
                siteIds.push(siteId);
            }
        } else if (cp.siteNextLink || cp.siteIdsJson === '[]' || checkpointSiteIds === undefined) {
            // https://learn.microsoft.com/graph/api/site-search
            let siteNextLink = checkpointSiteIds === undefined ? '' : cp.siteNextLink;
            const discoveredSiteIds = checkpointSiteIds ?? [];
            let nextEndpoint = siteNextLink || '/v1.0/sites';
            let hasMoreSites = true;

            while (hasMoreSites) {
                const response = await nango.get({
                    // https://learn.microsoft.com/graph/api/site-search
                    endpoint: nextEndpoint,
                    ...(siteNextLink ? {} : { params: { search: '*', $top: '100' } }),
                    retries: 3
                });

                const parsed = SitesResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse sites response: ${parsed.error.message}`);
                }

                for (const rawSite of parsed.data.value) {
                    const siteResult = SiteSchema.safeParse(rawSite);
                    if (siteResult.success) {
                        discoveredSiteIds.push(siteResult.data.id);
                    }
                }

                if (parsed.data['@odata.nextLink']) {
                    siteNextLink = toRelativeUrl(parsed.data['@odata.nextLink']);
                    await nango.saveCheckpoint({
                        siteNextLink,
                        siteIdsJson: JSON.stringify(discoveredSiteIds),
                        siteIndex: 0,
                        listNextLink: ''
                    });
                    nextEndpoint = siteNextLink;
                } else {
                    hasMoreSites = false;
                }
            }

            siteIds = discoveredSiteIds;
            siteIndex = 0;
            listNextLink = '';

            await nango.saveCheckpoint({
                siteNextLink: '',
                siteIdsJson: JSON.stringify(siteIds),
                siteIndex: 0,
                listNextLink: ''
            });
        } else {
            siteIds = checkpointSiteIds ?? [];
        }

        if (siteIds.length === 0) {
            return;
        }

        await nango.trackDeletesStart('List');

        for (let i = siteIndex; i < siteIds.length; i++) {
            const siteId = siteIds[i];
            if (!siteId) {
                continue;
            }
            let nextListEndpoint = listNextLink || `/v1.0/sites/${encodeURIComponent(siteId)}/lists`;
            let isFirstPageForSite = listNextLink === '';
            let hasMoreLists = true;

            while (hasMoreLists) {
                const response = await nango.get({
                    // https://learn.microsoft.com/graph/api/lists-list
                    endpoint: nextListEndpoint,
                    ...(isFirstPageForSite ? { params: { $top: '100' } } : {}),
                    retries: 3
                });
                isFirstPageForSite = false;

                const parsed = ListsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse lists response: ${parsed.error.message}`);
                }

                const lists: z.infer<typeof ListSchema>[] = [];

                for (const item of parsed.data.value) {
                    const parsedItem = ProviderListSchema.safeParse(item);
                    if (!parsedItem.success) {
                        throw new Error(`Failed to parse list: ${parsedItem.error.message}`);
                    }

                    const list = parsedItem.data;
                    const parentSiteId = list.parentReference.siteId;

                    lists.push({
                        id: `${parentSiteId}|${list.id}`,
                        site_id: parentSiteId,
                        ...(list.name !== undefined && { name: list.name }),
                        ...(list.displayName !== undefined && { displayName: list.displayName }),
                        ...(list.description !== undefined && { description: list.description }),
                        ...(list.webUrl !== undefined && { webUrl: list.webUrl }),
                        ...(list.createdDateTime !== undefined && { createdDateTime: list.createdDateTime }),
                        ...(list.lastModifiedDateTime !== undefined && { lastModifiedDateTime: list.lastModifiedDateTime }),
                        ...(list.list?.template !== undefined && { list_template: list.list.template }),
                        ...(list.list?.contentTypesEnabled !== undefined && { contentTypesEnabled: list.list.contentTypesEnabled }),
                        ...(list.list?.hidden !== undefined && { hidden: list.list.hidden })
                    });
                }

                if (lists.length > 0) {
                    await nango.batchSave(lists, 'List');
                }

                if (parsed.data['@odata.nextLink']) {
                    listNextLink = toRelativeUrl(parsed.data['@odata.nextLink']);
                    await nango.saveCheckpoint({
                        siteNextLink: '',
                        siteIdsJson: JSON.stringify(siteIds),
                        siteIndex: i,
                        listNextLink
                    });
                    nextListEndpoint = listNextLink;
                } else {
                    listNextLink = '';
                    const nextSiteIndex = i + 1;
                    if (nextSiteIndex < siteIds.length) {
                        await nango.saveCheckpoint({
                            siteNextLink: '',
                            siteIdsJson: JSON.stringify(siteIds),
                            siteIndex: nextSiteIndex,
                            listNextLink: ''
                        });
                    }
                    hasMoreLists = false;
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
