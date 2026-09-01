import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the Basecamp project containing the card table.'),
        columnId: z.string().describe('The ID of the card table column to update.'),
        title: z.string().describe('The new title for the card table column.'),
        description: z.string().optional().describe('The new description for the card table column.')
    })
    .describe('Input for updating a card table column.');

const ProviderColumnSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    app_url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the updated card table column.'),
        title: z.string().describe('The title of the updated card table column.'),
        description: z.string().optional().describe('The description of the updated card table column.'),
        type: z.string().optional().describe('The type of the record.'),
        url: z.string().optional().describe('The API URL for this column.'),
        app_url: z.string().optional().describe('The app URL for this column.'),
        created_at: z.string().optional().describe('The creation timestamp of the column.'),
        updated_at: z.string().optional().describe('The last updated timestamp of the column.')
    })
    .describe('Output of an updated card table column.');

/**
 * @tags: [write]
 * @tagReason: Updates the title and optional description of a card table column.
 * @pitfalls: A 404 error may indicate insufficient permissions or an inactive account rather than a missing column.
 */
const action = createAction({
    description: 'Update a card table column title or description.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/columns/${encodeURIComponent(input.columnId)}.json`,
            data: {
                title: input.title,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerColumn = ProviderColumnSchema.parse(response.data);

        return {
            id: String(providerColumn.id),
            title: providerColumn.title,
            ...(providerColumn.description != null && { description: providerColumn.description }),
            ...(providerColumn.type !== undefined && { type: providerColumn.type }),
            ...(providerColumn.url !== undefined && { url: providerColumn.url }),
            ...(providerColumn.app_url !== undefined && { app_url: providerColumn.app_url }),
            ...(providerColumn.created_at !== undefined && { created_at: providerColumn.created_at }),
            ...(providerColumn.updated_at !== undefined && { updated_at: providerColumn.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
