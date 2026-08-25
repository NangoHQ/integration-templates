import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSiteSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    webUrl: z.string().optional()
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional()
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    required: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    indexed: z.boolean().optional(),
    enforceUniqueValues: z.boolean().optional(),
    text: z.object({}).passthrough().optional(),
    number: z.object({}).passthrough().optional(),
    dateTime: z.object({}).passthrough().optional(),
    choice: z.object({}).passthrough().optional(),
    lookup: z.object({}).passthrough().optional(),
    personOrGroup: z.object({}).passthrough().optional(),
    boolean: z.object({}).passthrough().optional(),
    currency: z.object({}).passthrough().optional(),
    calculated: z.object({}).passthrough().optional(),
    hyperlinkOrPicture: z.object({}).passthrough().optional(),
    term: z.object({}).passthrough().optional(),
    thumbnail: z.object({}).passthrough().optional(),
    contentApprovalStatus: z.object({}).passthrough().optional(),
    geolocation: z.object({}).passthrough().optional()
});

const ListColumnSchema = z.object({
    id: z.string(),
    siteId: z.string(),
    listId: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    columnType: z.string().optional(),
    hidden: z.boolean().optional(),
    required: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    indexed: z.boolean().optional(),
    enforceUniqueValues: z.boolean().optional()
});

const ProviderODataResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    siteNextLink: z.string(),
    completedSiteIdsJson: z.string(),
    currentSiteId: z.string(),
    listNextLink: z.string(),
    completedListIdsJson: z.string(),
    currentListId: z.string(),
    columnNextLink: z.string()
});

const TYPE_PROPERTIES = [
    'text',
    'number',
    'dateTime',
    'choice',
    'lookup',
    'personOrGroup',
    'boolean',
    'currency',
    'calculated',
    'hyperlinkOrPicture',
    'term',
    'thumbnail',
    'contentApprovalStatus',
    'geolocation'
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function extractColumnType(column: unknown): string | undefined {
    if (!isRecord(column)) {
        return undefined;
    }
    for (const prop of TYPE_PROPERTIES) {
        if (column[prop] != null) {
            return prop;
        }
    }
    return undefined;
}

function toRelativeUrl(url: string): string {
    if (!url.startsWith('http')) {
        return url;
    }
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
}

const sync = createSync({
    description: 'Sync SharePoint list schemas.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/list-columns'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        ListColumn: ListColumnSchema
    },

    exec: async (nango) => {
        // Blocker: Microsoft Graph list columns endpoint has no changed-since filter,
        // no delta endpoint, and columnDefinition does not expose a lastModifiedDateTime.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const state = checkpoint.success
            ? checkpoint.data
            : {
                  siteNextLink: '',
                  completedSiteIdsJson: '',
                  currentSiteId: '',
                  listNextLink: '',
                  completedListIdsJson: '',
                  currentListId: '',
                  columnNextLink: ''
              };

        await nango.trackDeletesStart('ListColumn');

        const siteNextLink = state.siteNextLink ? toRelativeUrl(state.siteNextLink) : undefined;
        let listNextLink = state.listNextLink ? toRelativeUrl(state.listNextLink) : undefined;
        let columnNextLink = state.columnNextLink ? toRelativeUrl(state.columnNextLink) : undefined;
        const completedSiteIds = new Set(state.completedSiteIdsJson ? (z.array(z.string()).safeParse(JSON.parse(state.completedSiteIdsJson)).data ?? []) : []);
        let currentSiteId = state.currentSiteId || undefined;
        const completedListIds = new Set(state.completedListIdsJson ? (z.array(z.string()).safeParse(JSON.parse(state.completedListIdsJson)).data ?? []) : []);
        let currentListId = state.currentListId || undefined;

        async function fetchODataPage(endpoint: string, params?: Record<string, string | number>) {
            const config: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/resources/sharepoint
                endpoint,
                ...(params && { params }),
                retries: 3
            };
            const response = await nango.get(config);
            const parsed = ProviderODataResponseSchema.parse(response.data);
            return {
                items: parsed.value,
                nextLink: parsed['@odata.nextLink'] ? toRelativeUrl(parsed['@odata.nextLink']) : undefined
            };
        }

        function buildCheckpoint(partial: Partial<z.infer<typeof CheckpointSchema>>): z.infer<typeof CheckpointSchema> {
            return {
                siteNextLink: partial.siteNextLink ?? '',
                completedSiteIdsJson: partial.completedSiteIdsJson ?? '',
                currentSiteId: partial.currentSiteId ?? '',
                listNextLink: partial.listNextLink ?? '',
                completedListIdsJson: partial.completedListIdsJson ?? '',
                currentListId: partial.currentListId ?? '',
                columnNextLink: partial.columnNextLink ?? ''
            };
        }

        function mapColumn(siteId: string, listId: string, column: z.infer<typeof ProviderColumnSchema>): z.infer<typeof ListColumnSchema> {
            const columnType = extractColumnType(column);
            return {
                id: `${siteId}/${listId}/${column.id}`,
                siteId,
                listId,
                ...(column.name !== undefined && { name: column.name }),
                ...(column.displayName !== undefined && { displayName: column.displayName }),
                ...(column.description !== undefined && { description: column.description }),
                ...(columnType !== undefined && { columnType }),
                ...(column.hidden !== undefined && { hidden: column.hidden }),
                ...(column.required !== undefined && { required: column.required }),
                ...(column.readOnly !== undefined && { readOnly: column.readOnly }),
                ...(column.indexed !== undefined && { indexed: column.indexed }),
                ...(column.enforceUniqueValues !== undefined && { enforceUniqueValues: column.enforceUniqueValues })
            };
        }

        async function processColumns(siteId: string, listId: string, startUrl?: string) {
            let columnUrl: string | undefined = startUrl;
            while (true) {
                // https://learn.microsoft.com/graph/api/list-list-columns
                const { items, nextLink } = await fetchODataPage(
                    columnUrl || `/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/columns`,
                    columnUrl ? undefined : { $top: 100 }
                );
                const columns = z.array(ProviderColumnSchema).parse(items);
                const mapped = columns.map((col) => mapColumn(siteId, listId, col));

                if (mapped.length > 0) {
                    await nango.batchSave(mapped, 'ListColumn');
                }

                if (nextLink) {
                    await nango.saveCheckpoint(
                        buildCheckpoint({
                            currentSiteId: siteId,
                            currentListId: listId,
                            columnNextLink: nextLink,
                            completedSiteIdsJson: JSON.stringify(Array.from(completedSiteIds)),
                            completedListIdsJson: JSON.stringify(Array.from(completedListIds))
                        })
                    );
                    columnUrl = nextLink;
                } else {
                    break;
                }
            }
        }

        async function processLists(siteId: string, startUrl?: string) {
            let listUrl: string | undefined = startUrl;
            while (true) {
                // https://learn.microsoft.com/graph/api/list-list
                const { items, nextLink } = await fetchODataPage(
                    listUrl || `/v1.0/sites/${encodeURIComponent(siteId)}/lists`,
                    listUrl ? undefined : { $top: 100 }
                );
                const lists = z.array(ProviderListSchema).parse(items);

                for (const list of lists) {
                    if (completedListIds.has(list.id)) {
                        continue;
                    }

                    currentListId = list.id;
                    await processColumns(siteId, list.id);
                    completedListIds.add(list.id);
                    currentListId = undefined;
                }

                if (nextLink) {
                    await nango.saveCheckpoint(
                        buildCheckpoint({
                            currentSiteId: siteId,
                            listNextLink: nextLink,
                            completedSiteIdsJson: JSON.stringify(Array.from(completedSiteIds))
                        })
                    );
                    listUrl = nextLink;
                } else {
                    break;
                }
            }
        }

        // Resume from a saved column page first, then continue with remaining lists for that site.
        if (columnNextLink && currentSiteId && currentListId) {
            await processColumns(currentSiteId, currentListId, columnNextLink);
            completedListIds.add(currentListId);
            currentListId = undefined;
            columnNextLink = undefined;
            await processLists(currentSiteId);
            completedSiteIds.add(currentSiteId);
            currentSiteId = undefined;
            completedListIds.clear();
        }

        // Resume from a saved list page for a specific site.
        if (listNextLink && currentSiteId && !columnNextLink) {
            await processLists(currentSiteId, listNextLink);
            completedSiteIds.add(currentSiteId);
            currentSiteId = undefined;
            completedListIds.clear();
            listNextLink = undefined;
        }

        // Main sites crawl
        let siteUrl: string | undefined = siteNextLink;
        while (true) {
            const { items, nextLink } = await fetchODataPage(
                // https://learn.microsoft.com/graph/api/site-search
                siteUrl || '/v1.0/sites',
                siteUrl ? undefined : { search: '*', $top: 100 }
            );
            const sites = z.array(ProviderSiteSchema).parse(items);

            for (const site of sites) {
                if (completedSiteIds.has(site.id)) {
                    continue;
                }

                currentSiteId = site.id;
                await processLists(site.id);
                completedSiteIds.add(site.id);
                currentSiteId = undefined;
                completedListIds.clear();
            }

            if (nextLink) {
                await nango.saveCheckpoint(buildCheckpoint({ siteNextLink: nextLink }));
                siteUrl = nextLink;
            } else {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ListColumn');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
