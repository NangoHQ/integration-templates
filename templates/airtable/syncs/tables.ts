import { createSync } from 'nango';
import type { AirtableTable } from '../types';

import type { ProxyConfiguration } from 'nango';
import { Table, Base } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Lists all tables with their schema for all bases with a reference to the base id that\nthe table belongs to',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/tables'
        }
    ],

    scopes: ['schema.bases:read'],

    models: {
        Table: Table
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases'
            }
        };

        for await (const bases of nango.paginate<Base>(config)) {
            const allTables: Table[] = [];
            for (const base of bases) {
                const { id: baseId, name: baseName } = base;
                const tableConfig: ProxyConfiguration = {
                    // https://airtable.com/developers/web/api/get-base-schema
                    endpoint: `/v0/meta/bases/${baseId}/tables`,
                    retries: 10
                };

                const response = await nango.get<{ tables: AirtableTable[] }>(tableConfig);

                const { data } = response;

                const tables: Table[] = data.tables.map((aTable: AirtableTable) => {
                    const table: Table = {
                        id: aTable.id,
                        name: aTable.name,
                        views: aTable.views,
                        fields: aTable.fields,
                        primaryFieldId: aTable.primaryFieldId,
                        baseId,
                        baseName
                    };

                    return table;
                });

                allTables.push(...tables);
            }

            await nango.batchSave(allTables, 'Table');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
