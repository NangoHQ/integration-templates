import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSubsiteSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    webUrl: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional()
});

const SubsiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentSiteId: z.string().optional()
});

const sync = createSync({
    description: 'Sync subsites under selected parent sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Subsite: SubsiteSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/subsites'
        }
    ],

    exec: async (nango) => {
        // Blocker: Microsoft Graph /sites/{siteId}/sites does not expose a delta endpoint,
        // a changed-since filter, or a way to enumerate only modified or deleted subsites.
        // A full tree walk is required to detect deletions.
        await nango.trackDeletesStart('Subsite');

        const visited = new Set<string>();
        const queue: string[] = [];

        const enqueue = (id: string) => {
            if (!visited.has(id)) {
                visited.add(id);
                queue.push(id);
            }
        };

        const rootsConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/site-list
            endpoint: '/v1.0/sites',
            params: {
                $select: 'id'
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

        // https://learn.microsoft.com/graph/api/site-list
        for await (const page of nango.paginate(rootsConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from /sites');
            }

            for (const item of page) {
                const parsed = z.object({ id: z.string() }).safeParse(item);
                if (!parsed.success) {
                    throw new Error('Missing or invalid id in root site response');
                }
                enqueue(parsed.data.id);
            }
        }

        while (queue.length > 0) {
            const siteId = queue.shift();
            if (siteId === undefined) {
                continue;
            }

            const subsitesConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-list-subsites
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/sites`,
                params: {
                    $select: 'id,name,displayName,description,webUrl,createdDateTime,lastModifiedDateTime'
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

            // https://learn.microsoft.com/graph/api/site-list-subsites
            for await (const page of nango.paginate(subsitesConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Unexpected non-array page from /sites/{id}/sites');
                }

                const batchSubsites: Array<z.infer<typeof SubsiteSchema>> = [];

                for (const item of page) {
                    const parsed = ProviderSubsiteSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse subsite: ${parsed.error.message}`);
                    }

                    const site = parsed.data;
                    batchSubsites.push({
                        id: site.id,
                        ...(site.name != null && { name: site.name }),
                        ...(site.displayName != null && { displayName: site.displayName }),
                        ...(site.description != null && { description: site.description }),
                        ...(site.webUrl != null && { webUrl: site.webUrl }),
                        ...(site.createdDateTime != null && { createdDateTime: site.createdDateTime }),
                        ...(site.lastModifiedDateTime != null && { lastModifiedDateTime: site.lastModifiedDateTime }),
                        parentSiteId: siteId
                    });

                    enqueue(site.id);
                }

                if (batchSubsites.length > 0) {
                    await nango.batchSave(batchSubsites, 'Subsite');
                }
            }
        }

        await nango.trackDeletesEnd('Subsite');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
