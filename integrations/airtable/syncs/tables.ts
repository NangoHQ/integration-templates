import { createSync } from 'nango';
import { z } from 'zod';

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
});

const ProviderBasesResponseSchema = z.object({
    bases: ProviderBaseSchema.array(),
    offset: z.string().optional()
});

const ProviderTableFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const ProviderTableViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    primaryFieldId: z.string(),
    fields: ProviderTableFieldSchema.array(),
    views: ProviderTableViewSchema.array()
});

const ProviderTablesResponseSchema = z.object({
    tables: ProviderTableSchema.array()
});

const TableFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const TableViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    baseId: z.string(),
    baseName: z.string(),
    primaryFieldId: z.string(),
    fields: TableFieldSchema.array(),
    views: TableViewSchema.array()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable table schemas across bases in scope.',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tables'
        }
    ],
    scopes: ['schema.bases:read'],
    models: {
        Table: TableSchema
    },
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        // The Metadata API is full refresh only, but the bases list offset lets interrupted runs resume page-by-page.
        await nango.trackDeletesStart('Table');

        do {
            const baseResponse = await nango.get({
                // https://airtable.com/developers/web/api/list-bases
                endpoint: '/v0/meta/bases',
                params: {
                    ...(offset ? { offset } : {})
                },
                retries: 3
            });

            const parsedBases = ProviderBasesResponseSchema.parse(baseResponse.data);

            const allTables: z.infer<typeof TableSchema>[] = [];

            for (const base of parsedBases.bases) {
                const response = await nango.get({
                    // https://airtable.com/developers/web/api/get-base-schema
                    endpoint: `/v0/meta/bases/${base.id}/tables`,
                    retries: 3
                });

                const parsedTables = ProviderTablesResponseSchema.parse(response.data);

                for (const aTable of parsedTables.tables) {
                    const table: z.infer<typeof TableSchema> = {
                        id: aTable.id,
                        name: aTable.name,
                        baseId: base.id,
                        baseName: base.name,
                        primaryFieldId: aTable.primaryFieldId,
                        fields: aTable.fields,
                        views: aTable.views
                    };

                    allTables.push(table);
                }
            }

            if (allTables.length > 0) {
                await nango.batchSave(allTables, 'Table');
            }

            offset = parsedBases.offset;
            if (offset) {
                await nango.saveCheckpoint({ offset });
            }
        } while (offset);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
