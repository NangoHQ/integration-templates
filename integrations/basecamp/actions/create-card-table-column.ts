import { z } from 'zod';
import { createAction } from 'nango';

const ParentSchema = z.object({
    id: z.number().describe('Parent card table ID.'),
    title: z.string().describe('Parent card table title.'),
    type: z.string().describe('Parent resource type.')
});

const BucketSchema = z.object({
    id: z.number().describe('Project bucket ID.'),
    name: z.string().describe('Project bucket name.')
});

const InputSchema = z
    .object({
        project_id: z.number().describe('Project bucket ID containing the card table.'),
        card_table_id: z.number().describe('Card table ID to create the column in.'),
        title: z.string().describe('Title of the new column.'),
        description: z.string().optional().describe('Optional description of the new column.')
    })
    .describe('Input for creating a new card table column.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created column.'),
        status: z.string().describe('Current status of the column, e.g. "active".'),
        title: z.string().describe('Title of the column.'),
        description: z.string().optional().describe('Description of the column if provided.'),
        type: z.string().describe('Column type, e.g. "Kanban::Column".'),
        url: z.string().describe('API URL for the column.'),
        app_url: z.string().describe('Basecamp web app URL for the column.'),
        cards_url: z.string().describe('API URL for the cards in this column.'),
        created_at: z.string().describe('ISO 8601 timestamp when the column was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the column was last updated.'),
        cards_count: z.number().describe('Number of cards currently in the column.'),
        comment_count: z.number().describe('Number of comments on the column.'),
        parent: ParentSchema.describe('Parent card table reference.'),
        bucket: BucketSchema.describe('Project bucket reference.')
    })
    .describe('Output of the created card table column.');

const ProviderColumnSchema = z.object({
    id: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    cards_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    cards_count: z.number(),
    comment_count: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string()
    })
});

/**
 * @tags: [write]
 * @tagReason: Creates a new column on a Card Table.
 */
const action = createAction({
    description: 'Create a new column on a Card Table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
            endpoint: `/buckets/${encodeURIComponent(String(input.project_id))}/card_tables/${encodeURIComponent(String(input.card_table_id))}/columns.json`,
            data: {
                title: input.title,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'Provider returned an empty response.'
            });
        }

        const parsed = ProviderColumnSchema.parse(response.data);

        return {
            id: parsed.id,
            status: parsed.status,
            title: parsed.title,
            ...(parsed.description != null && { description: parsed.description }),
            type: parsed.type,
            url: parsed.url,
            app_url: parsed.app_url,
            cards_url: parsed.cards_url,
            created_at: parsed.created_at,
            updated_at: parsed.updated_at,
            cards_count: parsed.cards_count,
            comment_count: parsed.comment_count,
            parent: parsed.parent,
            bucket: parsed.bucket
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
