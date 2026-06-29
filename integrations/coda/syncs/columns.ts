import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    docId: z.string(),
    tableId: z.string()
});

const ProviderColumnSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            href: z.string().optional(),
            browserLink: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    format: z.record(z.string(), z.unknown()).optional(),
    display: z.boolean().optional(),
    calculated: z.boolean().optional(),
    formula: z.string().optional(),
    defaultValue: z.string().optional()
});

const ColumnSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    display: z.boolean().optional(),
    calculated: z.boolean().optional(),
    formula: z.string().optional(),
    defaultValue: z.string().optional(),
    format: z.record(z.string(), z.unknown()).optional(),
    parentId: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderColumnSchema),
    nextPageToken: z.string().optional()
});

const sync = createSync({
    description: 'Sync columns for a configured doc and table.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    endpoints: [{ method: 'GET', path: '/syncs/columns' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Column: ColumnSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        if (!metadata.docId) {
            throw new Error('docId is required in metadata');
        }

        if (!metadata.tableId) {
            throw new Error('tableId is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { pageToken: '' });
        let pageToken: string | undefined = checkpoint.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('Column');
        }

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const response = await nango.get({
                // https://coda.io/developers/apis/v1
                endpoint: `/docs/${encodeURIComponent(metadata.docId)}/tables/${encodeURIComponent(metadata.tableId)}/columns`,
                params: {
                    ...(pageToken ? { pageToken } : {}),
                    limit: 100
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);

            const mapped = parsed.items.map((col) => ({
                id: col.id,
                name: col.name,
                type: col.type,
                display: col.display,
                calculated: col.calculated,
                formula: col.formula,
                defaultValue: col.defaultValue,
                format: col.format,
                parentId: col.parent?.id
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Column');
            }

            pageToken = parsed.nextPageToken;
            await nango.saveCheckpoint({ pageToken: pageToken ?? '' });

            if (!pageToken) {
                break;
            }
        }

        await nango.trackDeletesEnd('Column');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
