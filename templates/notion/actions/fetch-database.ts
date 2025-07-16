import { createAction } from "nango";
import { databaseInputSchema } from '../schema.zod.js';
import type { Database as NotionDatabase } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { RowEntry, Database, DatabaseInput } from "../models.js";

const action = createAction({
    description: "Fetch a specific Notion database by passing in the database id. This action fetches the database and outputs an object. Note that this should be used for small databases.",
    version: "1.0.2",

    endpoint: {
        method: "GET",
        path: "/databases/single",
        group: "Databases"
    },

    input: DatabaseInput,
    output: Database,

    exec: async (nango, input): Promise<Database> => {
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
            retries: 3
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
