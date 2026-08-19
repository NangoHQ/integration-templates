import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    siteIds: z.array(z.string())
});

const CheckpointSchema = z.object({
    state_json: z.string()
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    columnGroup: z.string().optional(),
    hidden: z.boolean().optional(),
    indexed: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    required: z.boolean().optional(),
    enforceUniqueValues: z.boolean().optional(),
    type: z.string().optional(),
    text: z.record(z.string(), z.unknown()).optional(),
    number: z.record(z.string(), z.unknown()).optional(),
    boolean: z.record(z.string(), z.unknown()).optional(),
    dateTime: z.record(z.string(), z.unknown()).optional(),
    choice: z.record(z.string(), z.unknown()).optional(),
    lookup: z.record(z.string(), z.unknown()).optional(),
    personOrGroup: z.record(z.string(), z.unknown()).optional(),
    calculated: z.record(z.string(), z.unknown()).optional(),
    currency: z.record(z.string(), z.unknown()).optional(),
    hyperlinkOrPicture: z.record(z.string(), z.unknown()).optional(),
    term: z.record(z.string(), z.unknown()).optional(),
    thumbnail: z.record(z.string(), z.unknown()).optional(),
    geolocation: z.record(z.string(), z.unknown()).optional(),
    validation: z.record(z.string(), z.unknown()).optional(),
    defaultValue: z.record(z.string(), z.unknown()).optional(),
    sourceContentType: z.record(z.string(), z.unknown()).optional()
});

const SiteColumnSchema = z.object({
    id: z.string(),
    columnId: z.string(),
    siteId: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    columnGroup: z.string().optional(),
    hidden: z.boolean().optional(),
    indexed: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    required: z.boolean().optional(),
    enforceUniqueValues: z.boolean().optional(),
    type: z.string().optional(),
    text: z.record(z.string(), z.unknown()).optional(),
    number: z.record(z.string(), z.unknown()).optional(),
    boolean: z.record(z.string(), z.unknown()).optional(),
    dateTime: z.record(z.string(), z.unknown()).optional(),
    choice: z.record(z.string(), z.unknown()).optional(),
    lookup: z.record(z.string(), z.unknown()).optional(),
    personOrGroup: z.record(z.string(), z.unknown()).optional(),
    calculated: z.record(z.string(), z.unknown()).optional(),
    currency: z.record(z.string(), z.unknown()).optional(),
    hyperlinkOrPicture: z.record(z.string(), z.unknown()).optional(),
    term: z.record(z.string(), z.unknown()).optional(),
    thumbnail: z.record(z.string(), z.unknown()).optional(),
    geolocation: z.record(z.string(), z.unknown()).optional(),
    validation: z.record(z.string(), z.unknown()).optional(),
    defaultValue: z.record(z.string(), z.unknown()).optional(),
    sourceContentType: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync site-level column definitions for configured sites.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/site-columns',
            method: 'GET'
        }
    ],
    models: {
        SiteColumn: SiteColumnSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success || parsedMetadata.data.siteIds.length === 0) {
            throw new Error('siteIds are required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const state: { siteIndex: number; nextLink?: string } = { siteIndex: 0 };
        if (checkpoint != null) {
            const raw = JSON.parse(checkpoint.state_json);
            if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
                if (typeof raw.siteIndex === 'number') {
                    state.siteIndex = raw.siteIndex;
                }
                if (typeof raw.nextLink === 'string') {
                    state.nextLink = raw.nextLink;
                }
            }
        }
        const startSiteIndex = state.siteIndex;

        await nango.trackDeletesStart('SiteColumn');

        const siteIds = parsedMetadata.data.siteIds;

        for (let i = startSiteIndex; i < siteIds.length; i++) {
            const siteId = siteIds[i];
            if (typeof siteId !== 'string') {
                continue;
            }
            let nextLink: string | undefined;

            let endpoint: string;
            let baseUrlOverride: string | undefined;

            if (i === state.siteIndex && state.nextLink) {
                const url = new URL(state.nextLink);
                baseUrlOverride = url.origin;
                endpoint = url.pathname + url.search;
            } else {
                endpoint = `/v1.0/sites/${encodeURIComponent(siteId)}/columns`;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/site-list-columns
                endpoint,
                baseUrlOverride,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit: 100,
                    limit_name_in_request: '$top',
                    on_page: async ({ response }) => {
                        const parsed = z.object({ '@odata.nextLink': z.string().optional() }).parse(response.data);
                        nextLink = parsed['@odata.nextLink'];
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const rawColumns = z.array(ProviderColumnSchema).safeParse(page);
                if (!rawColumns.success) {
                    throw new Error(`Failed to parse site columns for site ${siteId}: ${rawColumns.error.message}`);
                }

                const columns = rawColumns.data.map((column) => ({
                    id: `${siteId}|${column.id}`,
                    columnId: column.id,
                    siteId,
                    ...(column.name !== undefined && { name: column.name }),
                    ...(column.displayName !== undefined && { displayName: column.displayName }),
                    ...(column.description !== undefined && { description: column.description }),
                    ...(column.columnGroup !== undefined && { columnGroup: column.columnGroup }),
                    ...(column.hidden !== undefined && { hidden: column.hidden }),
                    ...(column.indexed !== undefined && { indexed: column.indexed }),
                    ...(column.readOnly !== undefined && { readOnly: column.readOnly }),
                    ...(column.required !== undefined && { required: column.required }),
                    ...(column.enforceUniqueValues !== undefined && {
                        enforceUniqueValues: column.enforceUniqueValues
                    }),
                    ...(column.type !== undefined && { type: column.type }),
                    ...(column.text !== undefined && { text: column.text }),
                    ...(column.number !== undefined && { number: column.number }),
                    ...(column.boolean !== undefined && { boolean: column.boolean }),
                    ...(column.dateTime !== undefined && { dateTime: column.dateTime }),
                    ...(column.choice !== undefined && { choice: column.choice }),
                    ...(column.lookup !== undefined && { lookup: column.lookup }),
                    ...(column.personOrGroup !== undefined && { personOrGroup: column.personOrGroup }),
                    ...(column.calculated !== undefined && { calculated: column.calculated }),
                    ...(column.currency !== undefined && { currency: column.currency }),
                    ...(column.hyperlinkOrPicture !== undefined && {
                        hyperlinkOrPicture: column.hyperlinkOrPicture
                    }),
                    ...(column.term !== undefined && { term: column.term }),
                    ...(column.thumbnail !== undefined && { thumbnail: column.thumbnail }),
                    ...(column.geolocation !== undefined && { geolocation: column.geolocation }),
                    ...(column.validation !== undefined && { validation: column.validation }),
                    ...(column.defaultValue !== undefined && { defaultValue: column.defaultValue }),
                    ...(column.sourceContentType !== undefined && {
                        sourceContentType: column.sourceContentType
                    })
                }));

                if (columns.length > 0) {
                    await nango.batchSave(columns, 'SiteColumn');
                }

                await nango.saveCheckpoint({ state_json: JSON.stringify({ siteIndex: i, ...(nextLink && { nextLink }) }) });
            }

            await nango.saveCheckpoint({ state_json: JSON.stringify({ siteIndex: i + 1 }) });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SiteColumn');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
