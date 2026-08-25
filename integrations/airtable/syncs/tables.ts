import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

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

type ProviderBase = {
    id: string;
    name: string;
    permissionLevel?: string;
};

const sync = createSync({
    description: 'Sync Airtable table schemas across bases in scope.',
    version: '2.0.2',
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
        const offset = typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        let nextOffset: string | undefined;

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            params: {
                ...(offset ? { offset } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
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

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Table');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
