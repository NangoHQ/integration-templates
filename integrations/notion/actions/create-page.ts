import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Input schema - parent and properties are required, others optional
const InputSchema = z.object({
    parent: z
        .object({
            page_id: z.string().optional().describe('Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"'),
            database_id: z.string().optional().describe('Parent database ID. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"')
        })
        .describe('Parent page or database. Must include either page_id or database_id.'),
    properties: z
        .record(z.string(), z.any())
        .describe('Page properties. For pages with page parent, use title property. For database parents, use database property schema.'),
    children: z.array(z.any()).optional().describe('Array of block objects to add as page content.'),
    icon: z
        .object({
            type: z.string().optional(),
            emoji: z.string().optional(),
            external: z.object({ url: z.string() }).optional()
        })
        .optional()
        .describe('Page icon as emoji or external URL.'),
    cover: z
        .object({
            type: z.string().optional(),
            external: z.object({ url: z.string() }).optional()
        })
        .optional()
        .describe('Page cover image as external URL.')
});

// Output schema
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
        database_id: z.union([z.string(), z.null()])
    }),
    archived: z.boolean(),
    in_trash: z.boolean(),
    properties: z.record(z.string(), z.any()),
    url: z.string(),
    public_url: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Creates a new page as child of a page or database with optional content blocks.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/pages',
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
                ...(input.children && { children: input.children }),
                ...(input.icon && { icon: input.icon }),
                ...(input.cover && { cover: input.cover })
            },
            retries: 3
        };

        const response = await nango.post(config);
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
                database_id: data.parent.database_id ?? null
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
