import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page to update. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"'),
    properties: z.record(z.string(), z.any()).optional().describe('Page properties to update.'),
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
        .describe('Page cover image as external URL.'),
    archived: z.boolean().optional().describe('Set to true to archive the page.')
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
    description: 'Modifies page properties, icon, cover, or archived status.',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/pages/update',
        group: 'Pages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/patch-page
            endpoint: `v1/pages/${input.page_id}`,
            data: {
                ...(input.properties && { properties: input.properties }),
                ...(input.icon && { icon: input.icon }),
                ...(input.cover && { cover: input.cover }),
                ...(input.archived !== undefined && { archived: input.archived })
            },
            retries: 3
        };

        const response = await nango.patch(config);
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
