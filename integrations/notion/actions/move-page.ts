import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page to move. Example: "195de922-1179-449f-ab80-75a27c979105"'),
    parent: z
        .union([
            z.object({
                type: z.literal('page_id'),
                page_id: z.string().describe('The ID of the parent page to move the page under. Example: "b55c9c91-384d-452b-81db-d1ef79372b75"')
            }),
            z.object({
                type: z.literal('data_source_id'),
                data_source_id: z
                    .string()
                    .describe('The ID of the data source (database) to move the page into. Example: "1c7b35e6-e67f-8096-bf3f-000ba938459e"')
            })
        ])
        .describe('The new parent location for the page. Either a page_id or data_source_id parent.')
});

const ProviderPageSchema = z
    .object({
        id: z.string(),
        object: z.literal('page'),
        created_time: z.string().optional(),
        last_edited_time: z.string().optional(),
        created_by: z
            .object({
                object: z.literal('user'),
                id: z.string()
            })
            .optional(),
        last_edited_by: z
            .object({
                object: z.literal('user'),
                id: z.string()
            })
            .optional(),
        parent: z.object({
            type: z.string(),
            page_id: z.string().optional(),
            database_id: z.string().optional(),
            data_source_id: z.string().optional(),
            workspace: z.boolean().optional()
        }),
        archived: z.boolean().optional(),
        in_trash: z.boolean().optional(),
        url: z.string().optional(),
        public_url: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('page'),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional(),
    parent: z.object({
        type: z.string(),
        page_id: z.string().optional(),
        database_id: z.string().optional(),
        data_source_id: z.string().optional(),
        workspace: z.boolean().optional()
    }),
    archived: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    url: z.string().optional(),
    public_url: z.string().optional()
});

const action = createAction({
    description: 'Move a Notion page to a new parent location (under another page or into a database).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/move-page
        const response = await nango.post({
            endpoint: `/v1/pages/${encodeURIComponent(input.page_id)}/move`,
            data: {
                parent: input.parent
            },
            retries: 3
        });

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            object: providerPage.object,
            ...(providerPage.created_time !== undefined && { created_time: providerPage.created_time }),
            ...(providerPage.last_edited_time !== undefined && { last_edited_time: providerPage.last_edited_time }),
            parent: providerPage.parent,
            ...(providerPage.archived !== undefined && { archived: providerPage.archived }),
            ...(providerPage.in_trash !== undefined && { in_trash: providerPage.in_trash }),
            ...(providerPage.url !== undefined && { url: providerPage.url }),
            ...(providerPage.public_url !== undefined && providerPage.public_url !== null && { public_url: providerPage.public_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
