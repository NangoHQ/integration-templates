import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
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

type ProviderBase = z.infer<typeof ProviderBaseSchema>;

const sync = createSync({
    description: 'Sync Airtable table schemas across bases in scope.',
    version: '2.0.1',
    frequency: 'every day',
    autoStart: true,
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
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases'
            }
        };

        await nango.trackDeletesStart('Table');

        for await (const page of nango.paginate<ProviderBase>(config)) {
            const allTables: z.infer<typeof TableSchema>[] = [];

            for (const base of page) {
                const response = await nango.get({
                    // https://airtable.com/developers/web/api/get-base-schema
                    endpoint: `/v0/meta/bases/${base.id}/tables`,
                    retries: 3
                });

                const parsedTables = ProviderTablesResponseSchema.parse(response.data);

                for (const aTable of parsedTables.tables) {
                    allTables.push({
                        id: aTable.id,
                        name: aTable.name,
                        baseId: base.id,
                        baseName: base.name,
                        primaryFieldId: aTable.primaryFieldId,
                        fields: aTable.fields,
                        views: aTable.views
                    });
                }
            }

            if (allTables.length > 0) {
                await nango.batchSave(allTables, 'Table');
            }
        }

        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
