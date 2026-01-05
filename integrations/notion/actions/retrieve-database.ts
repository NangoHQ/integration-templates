import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    database_id: z.string()
        .describe('The ID of the database to retrieve. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    title: z.array(z.any()),
    properties: z.record(z.string(), z.any())
});

const action = createAction({
    description: 'Gets database schema and column structure.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/databases/get',
        group: 'Databases'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/retrieve-a-database
            endpoint: `v1/databases/${input.database_id}`,
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            created_time: data.created_time,
            last_edited_time: data.last_edited_time,
            title: data.title,
            properties: data.properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
