import type { NangoSync, ProxyConfiguration, NotionCompleteDatabase } from '../../models.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    for await (const databases of nango.paginate({
        method: 'post',
        // https://developers.notion.com/reference/post-search
        endpoint: '/v1/search',
        data: {
            filter: {
                value: 'database',
                property: 'object'
            }
        },
        paginate: {
            response_path: 'results'
        },
        retries: 10
    })) {
        for (const database of databases) {
            const proxyConfig: ProxyConfiguration = {
                method: 'POST',
                // https://developers.notion.com/reference/post-database-query
                endpoint: `/v1/databases/${database.id}/query`,
                paginate: {
                    cursor_path_in_response: 'next_cursor'
                }
            };
            for await (const databaseInfo of nango.paginate(proxyConfig)) {
                const rows: NotionCompleteDatabase[] = [];
                for (const db of databaseInfo) {
                    const properties = db.properties;
                    const row: NotionCompleteDatabase = {
                        id: db.id,
                        meta: {
                            databaseId: database.id,
                            path: database.url,
                            title: 'title' in database && database.title[0] && database.title[0].plain_text ? database.title[0].plain_text : '',
                            last_modified: database.last_edited_time
                        },
                        row: properties
                    };
                    rows.push(row);
                }
                await nango.batchSave(rows, 'NotionCompleteDatabase');
            }
        }
    }
}
