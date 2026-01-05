import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page_id: z.string()
        .describe('The ID of the page to retrieve. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    created_by: z.object({
        object: z.string(),
        id: z.string()
    }),
    last_edited_by: z.object({
        object: z.string(),
        id: z.string()
    }),
    parent: z.object({
        type: z.string(),
        page_id: z.union([z.string(), z.null()]),
        database_id: z.union([z.string(), z.null()]),
        workspace: z.union([z.boolean(), z.null()])
    }),
    archived: z.boolean(),
    in_trash: z.boolean(),
    properties: z.record(z.string(), z.any()),
    url: z.string(),
    public_url: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Fetches page properties and metadata by page ID.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/pages',
        group: 'Pages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/retrieve-a-page
            endpoint: `v1/pages/${input.page_id}`,
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            created_time: data.created_time,
            last_edited_time: data.last_edited_time,
            created_by: {
                object: data.created_by.object,
                id: data.created_by.id
            },
            last_edited_by: {
                object: data.last_edited_by.object,
                id: data.last_edited_by.id
            },
            parent: {
                type: data.parent.type,
                page_id: data.parent.page_id ?? null,
                database_id: data.parent.database_id ?? null,
                workspace: data.parent.workspace ?? null
            },
            archived: data.archived,
            in_trash: data.in_trash,
            properties: data.properties,
            url: data.url,
            public_url: data.public_url ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
