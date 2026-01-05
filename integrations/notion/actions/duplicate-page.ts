import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    parent: z
        .object({
            page_id: z.string().optional().describe('Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"'),
            database_id: z.string().optional().describe('Parent database ID.')
        })
        .describe('Parent page or database for the duplicate.'),
    properties: z.record(z.string(), z.any()).describe('Page properties for the duplicate.'),
    children: z.array(z.any()).optional().describe('Content blocks to include in the duplicate.')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string(),
    parent: z.object({
        type: z.string(),
        page_id: z.union([z.string(), z.null()]),
        database_id: z.union([z.string(), z.null()])
    }),
    properties: z.record(z.string(), z.any())
});

const action = createAction({
    description: 'Creates a copy of a page including all content and properties.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/pages/duplicate',
        group: 'Pages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/post-page
            endpoint: 'v1/pages',
            data: {
                parent: input.parent,
                properties: input.properties,
                ...(input.children && { children: input.children })
            },
            retries: 3
        };

        const response = await nango.post(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            created_time: data.created_time,
            parent: {
                type: data.parent.type,
                page_id: data.parent.page_id ?? null,
                database_id: data.parent.database_id ?? null
            },
            properties: data.properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
