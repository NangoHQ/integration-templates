import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    docId: z.string().describe('The ID of the Coda doc containing the table'),
    tableId: z.string().describe('The ID of the table to sync rows from')
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const ProviderRowSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    href: z.string().optional(),
    name: z.string().optional(),
    index: z.number().optional(),
    browserLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional()
});

const RowSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    index: z.number().optional(),
    browserLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync rows for a configured doc and table.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Row: RowSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/rows'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }
        const docId = parsedMetadata.data.docId;
        const tableId = parsedMetadata.data.tableId;

        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { pageToken: '' });
        let pageToken: string | undefined = checkpoint.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Row');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://coda.io/developers/apis/v1#operation/listRows
            endpoint: `/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableId)}/rows`,
            params: {
                ...(pageToken ? { pageToken } : {}),
                sortBy: 'updatedAt',
                useColumnNames: 'true',
                valueFormat: 'simple'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rows: z.infer<typeof RowSchema>[] = [];
            for (const raw of page) {
                const parsed = ProviderRowSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse row: ${parsed.error.message}`);
                }
                const row = parsed.data;
                rows.push({
                    id: row.id,
                    ...(row.name != null && { name: row.name }),
                    ...(row.index !== undefined && { index: row.index }),
                    ...(row.browserLink != null && { browserLink: row.browserLink }),
                    ...(row.createdAt != null && { createdAt: row.createdAt }),
                    ...(row.updatedAt != null && { updatedAt: row.updatedAt }),
                    ...(row.values !== undefined && { values: row.values })
                });
            }

            if (rows.length > 0) {
                await nango.batchSave(rows, 'Row');
            }

            await nango.saveCheckpoint({ pageToken: pageToken ?? '' });
        }

        await nango.trackDeletesEnd('Row');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
