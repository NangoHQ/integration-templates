import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { NotionCompleteDatabase } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Sync a database content with each row as an entry. Store the top level\ndatabase information in the metadata to be able to reconcile the database",
    version: "2.0.0",
    frequency: "every 1h",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/databases",
        group: "Databases"
    }],

    models: {
        NotionCompleteDatabase: NotionCompleteDatabase
    },

    metadata: z.object({}),

    exec: async nango => {
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
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
