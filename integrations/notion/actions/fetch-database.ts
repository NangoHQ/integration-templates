import type { NangoAction, RowEntry, DatabaseInput, Database, ProxyConfiguration } from '../../models';
import { databaseInputSchema } from '../schema.zod.js';
import type { Database as NotionDatabase } from '../types.js';

export default async function runAction(nango: NangoAction, input: DatabaseInput): Promise<Database> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: databaseInputSchema, input });

    const proxyConfig: ProxyConfiguration = {
        method: 'POST',
        // https://developers.notion.com/reference/post-database-query
        endpoint: `/v1/databases/${parsedInput.data.databaseId}/query`
    };

    const entries: RowEntry[] = [];

    for await (const databases of nango.paginate<NotionDatabase>(proxyConfig)) {
        for (const db of databases) {
            const id = db.id;
            const row = db.properties;
            entries.push({ id, row });
        }
    }

    const databaseResponse = await nango.get({
        // https://developers.notion.com/reference/retrieve-a-database
        endpoint: `/v1/databases/${parsedInput.data.databaseId}`,
        retries: 10
    });

    const { data } = databaseResponse;

    return {
        id: input.databaseId,
        title: 'title' in data && data.title[0] ? data.title[0].plain_text : '',
        path: data.url,
        last_modified: data.last_edited_time,
        meta: {
            created_time: data.created_time,
            last_edited_time: data.last_edited_time
        },
        entries
    };
}
