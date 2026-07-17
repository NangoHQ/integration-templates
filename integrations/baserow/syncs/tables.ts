import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTableSchema = z.object({
    id: z.number(),
    name: z.string(),
    order: z.number(),
    database_id: z.number(),
    created_on: z.string().optional(),
    last_modified: z.string().nullable().optional()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    order: z.number().optional(),
    database_id: z.number().optional(),
    created_on: z.string().optional(),
    last_modified: z.string().optional()
});

const sync = createSync({
    description: 'Sync all tables visible to the database token.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Table: TableSchema
    },

    exec: async (nango) => {
        // https://api.baserow.io/api/redoc/
        const response = await nango.get({
            endpoint: '/database/tables/all-tables/',
            retries: 3
        });

        const parsed = z.array(ProviderTableSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse tables response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Table');

        const tables = parsed.data.map((table) => ({
            id: String(table.id),
            ...(table.name != null && { name: table.name }),
            ...(table.order != null && { order: table.order }),
            ...(table.database_id != null && { database_id: table.database_id }),
            ...(table.created_on != null && { created_on: table.created_on }),
            ...(table.last_modified != null && { last_modified: table.last_modified })
        }));

        if (tables.length > 0) {
            await nango.batchSave(tables, 'Table');
        }

        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
