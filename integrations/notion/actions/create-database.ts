import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    parent: z.object({
        page_id: z.string()
            .describe('Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"')
    }).describe('Parent page where database will be created.'),
    title: z.array(z.object({
        text: z.object({
            content: z.string()
        })
    })).describe('Database title as rich text array.'),
    properties: z.record(z.string(), z.any())
        .describe('Database property schema. Example: {"Name":{"title":{}},"Description":{"rich_text":{}}}')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string(),
    title: z.array(z.any()),
    properties: z.record(z.string(), z.any())
});

const action = createAction({
    description: 'Creates a new database as subpage with defined properties schema.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/databases',
        group: 'Databases'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/create-a-database
            endpoint: 'v1/databases',
            data: {
                parent: input.parent,
                title: input.title,
                properties: input.properties
            },
            retries: 3
        };

        const response = await nango.post(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            created_time: data.created_time,
            title: data.title,
            properties: data.properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
