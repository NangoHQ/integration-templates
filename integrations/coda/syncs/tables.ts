import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    docId: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    type: z.string(),
    tableType: z.string(),
    href: z.string().optional(),
    name: z.string(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            browserLink: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    browserLink: z.string().optional(),
    displayColumn: z
        .object({
            id: z.string(),
            type: z.string(),
            name: z.string().optional(),
            href: z.string().optional()
        })
        .optional(),
    rowCount: z.number().optional(),
    sorts: z.array(z.unknown()).optional(),
    layout: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    parentTable: z
        .object({
            id: z.string(),
            type: z.string(),
            tableType: z.string().optional(),
            href: z.string().optional(),
            name: z.string().optional(),
            browserLink: z.string().optional()
        })
        .optional()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    tableType: z.string().optional(),
    href: z.string().optional(),
    browserLink: z.string().optional(),
    rowCount: z.number().optional(),
    layout: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    parentTableId: z.string().optional(),
    parentPageId: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const sync = createSync({
    description: 'Sync tables and views for a configured doc',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Table: TableSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/tables' }],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);
        if (!metadata.success) {
            throw new Error('Invalid metadata: docId is required');
        }
        const docId = metadata.data.docId;

        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { pageToken: '' });
        let pageToken: string | undefined = checkpoint.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Table');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodeURIComponent(docId)}/tables`,
            params: {
                ...(pageToken ? { pageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit: 100,
                limit_name_in_request: 'limit',
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderTableSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse tables: ${parsed.error.message}`);
            }

            const tables = parsed.data.map((table) => ({
                id: table.id,
                name: table.name,
                ...(table.tableType != null && { tableType: table.tableType }),
                ...(table.href != null && { href: table.href }),
                ...(table.browserLink != null && { browserLink: table.browserLink }),
                ...(table.rowCount != null && { rowCount: table.rowCount }),
                ...(table.layout != null && { layout: table.layout }),
                ...(table.createdAt != null && { createdAt: table.createdAt }),
                ...(table.updatedAt != null && { updatedAt: table.updatedAt }),
                ...(table.parentTable?.id != null && { parentTableId: table.parentTable.id }),
                ...(table.parent?.id != null && { parentPageId: table.parent.id })
            }));

            if (tables.length > 0) {
                await nango.batchSave(tables, 'Table');
            }

            await nango.saveCheckpoint({ pageToken: pageToken ?? '' });
        }

        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
