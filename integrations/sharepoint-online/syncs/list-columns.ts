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

const sync = createSync({
    description: 'Sync SharePoint list schemas.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/list-columns'
        }
    ],
    models: {
        ListColumn: ListColumnSchema
    },

    exec: async (nango) => {
        // Blocker: Microsoft Graph list columns endpoint has no changed-since filter,
        // no delta endpoint, and columnDefinition does not expose a lastModifiedDateTime.
        await nango.trackDeletesStart('ListColumn');

        const sitesConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/site-search
            endpoint: '/v1.0/sites',
            params: {
                search: '*'
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

        const allColumns: z.infer<typeof ListColumnSchema>[] = [];

        for await (const sitesBatch of nango.paginate<unknown>(sitesConfig)) {
            const sites = z.array(ProviderSiteSchema).parse(sitesBatch);

            for (const site of sites) {
                const listsConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/graph/api/list-list
                    endpoint: `/v1.0/sites/${encodeURIComponent(site.id)}/lists`,
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: '@odata.nextLink',
                        response_path: 'value',
                        limit_name_in_request: '$top',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const listsBatch of nango.paginate<unknown>(listsConfig)) {
                    const lists = z.array(ProviderListSchema).parse(listsBatch);

                    for (const list of lists) {
                        const columnsConfig: ProxyConfiguration = {
                            // https://learn.microsoft.com/graph/api/list-list-columns
                            endpoint: `/v1.0/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/columns`,
                            paginate: {
                                type: 'link',
                                link_path_in_response_body: '@odata.nextLink',
                                response_path: 'value',
                                limit_name_in_request: '$top',
                                limit: 100
                            },
                            retries: 3
                        };

                        for await (const columnsBatch of nango.paginate<unknown>(columnsConfig)) {
                            const columns = z.array(ProviderColumnSchema).parse(columnsBatch);

                            for (const column of columns) {
                                const columnType = extractColumnType(column);
                                allColumns.push({
                                    id: `${site.id}/${list.id}/${column.id}`,
                                    siteId: site.id,
                                    listId: list.id,
                                    ...(column.name !== undefined && { name: column.name }),
                                    ...(column.displayName !== undefined && { displayName: column.displayName }),
                                    ...(column.description !== undefined && { description: column.description }),
                                    ...(columnType !== undefined && { columnType }),
                                    ...(column.hidden !== undefined && { hidden: column.hidden }),
                                    ...(column.required !== undefined && { required: column.required }),
                                    ...(column.readOnly !== undefined && { readOnly: column.readOnly }),
                                    ...(column.indexed !== undefined && { indexed: column.indexed }),
                                    ...(column.enforceUniqueValues !== undefined && { enforceUniqueValues: column.enforceUniqueValues })
                                });
                            }
                        }
                    }
                }
            }
        }

        if (allColumns.length > 0) {
            await nango.batchSave(allColumns, 'ListColumn');
        }

        await nango.trackDeletesEnd('ListColumn');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
