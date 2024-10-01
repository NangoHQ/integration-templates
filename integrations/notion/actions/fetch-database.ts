import type { NangoAction, DatabaseInput, Database, ProxyConfiguration } from '../../models';
import { databaseInputSchema } from '../../schema.zod.js';
import type { Database as NotionDatabase } from '../types.js';

export default async function runAction(nango: NangoAction, input: DatabaseInput): Promise<Database> {
    const parsedInput = databaseInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch a database: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to fetch a page'
        });
    }

    const proxyConfig: ProxyConfiguration = {
        method: 'POST',
        endpoint: `/v1/databases/${parsedInput.data.databaseId}/query`,
        paginate: {
            cursor_path_in_response: 'next_cursor'
        }
    };

    const entries: Database['entries'] = [];

    for await (const databases of nango.paginate<NotionDatabase>(proxyConfig)) {
        for (const db of databases) {
            const entry = db.properties;
            entries.push(entry);
        }
    }

    const databaseResponse = await nango.get({
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
