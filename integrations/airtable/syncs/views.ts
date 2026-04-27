import { createSync } from 'nango';
import { z } from 'zod';

const ProviderBaseSchema = z.object({
    id: z.string()
});

const ProviderBasesResponseSchema = z.object({
    bases: z.array(ProviderBaseSchema),
    offset: z.string().optional()
});

const ProviderViewSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    primaryFieldId: z.string().optional(),
    views: z.array(ProviderViewSchema).optional()
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    base_id: z.string(),
    table_id: z.string(),
    table_name: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable views for bases and tables in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        View: ViewSchema
    },

    endpoints: [
        {
            method: 'GET',
            path: '/syncs/views'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        // Airtable view metadata comes from full table schema reads, so resume is based on the paginated bases list.
        await nango.trackDeletesStart('View');

        do {
            const basesResponse = await nango.get({
                // https://airtable.com/developers/web/api/list-bases
                endpoint: '/v0/meta/bases',
                params: {
                    ...(offset ? { offset } : {})
                },
                retries: 3
            });

            const basesData = ProviderBasesResponseSchema.parse(basesResponse.data);
            const allViews: z.infer<typeof ViewSchema>[] = [];

            for (const base of basesData.bases) {
                const tablesResponse = await nango.get({
                    // https://airtable.com/developers/web/api/get-base-schema
                    // Returns tables including their views as embedded metadata.
                    endpoint: `/v0/meta/bases/${base.id}/tables`,
                    retries: 3
                });

                const tablesData = z.object({ tables: z.array(TableSchema) }).parse(tablesResponse.data);

                for (const table of tablesData.tables) {
                    const tableViews = table.views ?? [];
                    const views = tableViews.map((view) => ({
                        id: view.id,
                        ...(view.name != null && { name: view.name }),
                        ...(view.type != null && { type: view.type }),
                        base_id: base.id,
                        table_id: table.id,
                        ...(table.name != null && { table_name: table.name })
                    }));

                    allViews.push(...views);
                }
            }

            if (allViews.length > 0) {
                await nango.batchSave(allViews, 'View');
            }

            offset = basesData.offset;
            if (offset) {
                await nango.saveCheckpoint({ offset });
            }
        } while (offset);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('View');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
