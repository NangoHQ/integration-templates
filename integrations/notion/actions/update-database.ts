import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    database_id: z.string()
        .describe('The ID of the database to update. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"'),
    title: z.array(z.object({
        text: z.object({
            content: z.string()
        })
    })).optional()
        .describe('New database title as rich text array.'),
    description: z.array(z.any()).optional()
        .describe('Database description as rich text array.'),
    properties: z.record(z.string(), z.any()).optional()
        .describe('Property schema updates.')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    title: z.array(z.any()),
    properties: z.record(z.string(), z.any())
});

const action = createAction({
    description: 'Modifies database title, description, or properties schema.',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/databases/update',
        group: 'Databases'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/update-a-database
            endpoint: `v1/databases/${input.database_id}`,
            data: {
                ...(input.title && { title: input.title }),
                ...(input.description && { description: input.description }),
                ...(input.properties && { properties: input.properties })
            },
            retries: 3
        };

        const response = await nango.patch(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            title: data.title,
            properties: data.properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
