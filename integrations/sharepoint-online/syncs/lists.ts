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

const sync = createSync({
    description: 'Sync SharePoint lists for selected sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
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
        const metadata = await nango.getMetadata();
        const siteIds: string[] = [];

        if (metadata?.site_ids !== undefined && metadata.site_ids.length > 0) {
            for (const siteId of metadata.site_ids) {
                siteIds.push(siteId);
            }
        } else {
            // https://learn.microsoft.com/graph/api/site-search
            for await (const sitesPage of nango.paginate({
                endpoint: '/v1.0/sites',
                params: {
                    search: '*'
                },
                paginate: {
                    type: 'link',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 100,
                    link_path_in_response_body: '@odata.nextLink'
                },
                retries: 3
            })) {
                for (const site of sitesPage) {
                    const parsed = SiteSchema.safeParse(site);
                    if (parsed.success) {
                        siteIds.push(parsed.data.id);
                    }
                }
            }
        }

        if (siteIds.length === 0) {
            return;
        }

        await nango.trackDeletesStart('List');

        for (const siteId of siteIds) {
            // https://learn.microsoft.com/graph/api/lists-list
            for await (const listsPage of nango.paginate({
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/lists`,
                paginate: {
                    type: 'link',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 100,
                    link_path_in_response_body: '@odata.nextLink'
                },
                retries: 3
            })) {
                const lists: z.infer<typeof ListSchema>[] = [];

                for (const item of listsPage) {
                    const parsed = ProviderListSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse list: ${parsed.error.message}`);
                    }

                    const list = parsed.data;
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
            }
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
