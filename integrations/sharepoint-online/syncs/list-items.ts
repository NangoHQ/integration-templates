import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListItemSchema = z.object({
    id: z.string(),
    siteId: z.string(),
    listId: z.string(),
    itemId: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    contentTypeId: z.string().optional(),
    contentTypeName: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    delta_links_json: z.string()
});

const DeltaLinksSchema = z.record(z.string(), z.string());

const SiteSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const GraphListItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    contentType: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    deleted: z.object({}).optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

function parseDeltaLinks(input: string | undefined): Record<string, string> {
    if (!input) {
        return {};
    }

    try {
        const parsed = JSON.parse(input);
        const result = DeltaLinksSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // Ignore malformed checkpoint data and restart the delta crawl.
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

function getHeaderValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
    if (!headers) {
        return undefined;
    }

    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== lowerName) {
            continue;
        }

        if (typeof value === 'string') {
            return value;
        }

        if (Array.isArray(value) && typeof value[0] === 'string') {
            return value[0];
        }
    }

    return undefined;
}

const sync = createSync({
    description: 'Sync items from selected SharePoint lists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ListItem: ListItemSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/list-items'
        }
    ],
    scopes: ['Sites.Read.All'],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const deltaLinks = parseDeltaLinks(checkpoint.success ? checkpoint.data.delta_links_json : undefined);

        const siteConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/site-list
            endpoint: '/v1.0/sites?search=*',
            paginate: {
                type: 'link',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink'
            },
            retries: 3
        };

        for await (const sitePage of nango.paginate(siteConfig)) {
            const sitesResult = z.array(SiteSchema).safeParse(sitePage);
            if (!sitesResult.success) {
                throw new Error(`Failed to parse sites: ${sitesResult.error.message}`);
            }

            for (const site of sitesResult.data) {
                const listConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/graph/api/list-list
                    endpoint: `/v1.0/sites/${encodeURIComponent(site.id)}/lists`,
                    paginate: {
                        type: 'link',
                        limit_name_in_request: '$top',
                        limit: 100,
                        response_path: 'value',
                        link_path_in_response_body: '@odata.nextLink'
                    },
                    retries: 3
                };

                for await (const listPage of nango.paginate(listConfig)) {
                    const listsResult = z.array(ListSchema).safeParse(listPage);
                    if (!listsResult.success) {
                        throw new Error(`Failed to parse lists: ${listsResult.error.message}`);
                    }

                    for (const list of listsResult.data) {
                        const listKey = `${site.id}|${list.id}`;
                        let nextUrl = deltaLinks[listKey];
                        if (!nextUrl) {
                            // https://learn.microsoft.com/graph/api/listitem-delta
                            nextUrl = `/v1.0/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/items/delta?$expand=fields&$top=100`;
                        } else {
                            nextUrl = toRelativeUrl(nextUrl);
                        }

                        let lastDeltaLink: string | undefined;

                        while (nextUrl) {
                            const response = await nango.get({
                                // https://learn.microsoft.com/graph/api/listitem-delta
                                endpoint: nextUrl,
                                retries: 3
                            });

                            if (response.status === 410) {
                                const location = getHeaderValue(response.headers, 'location');
                                if (!location) {
                                    throw new Error(`Delta token expired for list ${list.id}, but no replacement location was returned.`);
                                }

                                nextUrl = toRelativeUrl(location);
                                lastDeltaLink = undefined;
                                continue;
                            }

                            if (response.status < 200 || response.status >= 300) {
                                throw new Error(`Failed to fetch list item delta for list ${list.id}: ${response.status}`);
                            }

                            const deltaResponse = DeltaResponseSchema.parse(response.data);
                            const latestItemsById = new Map<string, z.infer<typeof GraphListItemSchema>>();

                            for (const rawItem of deltaResponse.value) {
                                const itemResult = GraphListItemSchema.safeParse(rawItem);
                                if (!itemResult.success) {
                                    throw new Error(`Failed to parse list item delta: ${itemResult.error.message}`);
                                }

                                latestItemsById.set(itemResult.data.id, itemResult.data);
                            }

                            const upserts: Array<z.infer<typeof ListItemSchema>> = [];
                            const deletions: Array<{ id: string }> = [];

                            for (const item of latestItemsById.values()) {
                                const modelId = `${site.id}_${list.id}_${item.id}`;
                                if (item.deleted) {
                                    deletions.push({ id: modelId });
                                    continue;
                                }

                                let itemName: string | undefined;
                                if (item.name != null) {
                                    itemName = item.name;
                                } else if (item.fields != null) {
                                    if ('Title' in item.fields && typeof item.fields['Title'] === 'string') {
                                        itemName = item.fields['Title'];
                                    } else if ('FileLeafRef' in item.fields && typeof item.fields['FileLeafRef'] === 'string') {
                                        itemName = item.fields['FileLeafRef'];
                                    }
                                }

                                upserts.push({
                                    id: modelId,
                                    siteId: site.id,
                                    listId: list.id,
                                    itemId: item.id,
                                    ...(itemName != null && { name: itemName }),
                                    ...(item.webUrl != null && { webUrl: item.webUrl }),
                                    ...(item.createdDateTime != null && { createdDateTime: item.createdDateTime }),
                                    ...(item.lastModifiedDateTime != null && { lastModifiedDateTime: item.lastModifiedDateTime }),
                                    ...(item.contentType?.id != null && { contentTypeId: item.contentType.id }),
                                    ...(item.contentType?.name != null && { contentTypeName: item.contentType.name }),
                                    ...(item.fields != null && { fields: item.fields })
                                });
                            }

                            if (upserts.length > 0) {
                                await nango.batchSave(upserts, 'ListItem');
                            }

                            if (deletions.length > 0) {
                                await nango.batchDelete(deletions, 'ListItem');
                            }

                            if (typeof deltaResponse['@odata.deltaLink'] === 'string') {
                                lastDeltaLink = deltaResponse['@odata.deltaLink'];
                            }

                            if (typeof deltaResponse['@odata.nextLink'] === 'string') {
                                nextUrl = toRelativeUrl(deltaResponse['@odata.nextLink']);
                            } else {
                                nextUrl = undefined;
                            }
                        }

                        if (lastDeltaLink) {
                            deltaLinks[listKey] = lastDeltaLink;
                            await nango.saveCheckpoint({
                                delta_links_json: JSON.stringify(deltaLinks)
                            });
                        }
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
