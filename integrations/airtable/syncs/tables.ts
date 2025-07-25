import type { NangoSync, ProxyConfiguration, Base, Table } from '../../models.js';
import type { AirtableTable } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
