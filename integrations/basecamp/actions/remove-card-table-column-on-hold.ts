import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the card table column.'),
        columnId: z.number().describe('The ID of the card table column to remove the on-hold section from.')
    })
    .describe('Input to remove the on-hold section from a card table column.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the card table column.'),
        status: z.string().describe('The current status of the column, e.g. "active".'),
        visible_to_clients: z.boolean().describe('Whether the column is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the column was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the column was last updated.'),
        title: z.string().describe('The title of the card table column.'),
        inherits_status: z.boolean().describe('Whether the column inherits its status from the parent card table.'),
        type: z.string().describe('The type of the column, e.g. "Kanban::Triage".'),
        url: z.string().describe('The API URL for this column.'),
        app_url: z.string().describe('The Basecamp app URL for this column.'),
        bookmark_url: z.string().describe('The bookmark URL for this column.'),
        subscription_url: z.string().describe('The subscription URL for this column.'),
        parent: z
            .object({
                id: z.number().describe('The ID of the parent card table.'),
                title: z.string().describe('The title of the parent card table.'),
                type: z.string().describe('The type of the parent card table.'),
                url: z.string().describe('The API URL of the parent card table.'),
                app_url: z.string().describe('The Basecamp app URL of the parent card table.')
            })
            .describe('The parent card table containing this column.'),
        bucket: z
            .object({
                id: z.number().describe('The ID of the project bucket.'),
                name: z.string().describe('The name of the project bucket.'),
                type: z.string().describe('The type of the bucket, e.g. "Project".')
            })
            .describe('The project bucket that contains this column.'),
        creator: z
            .object({
                id: z.number().describe('The ID of the person who created the column.'),
                name: z.string().describe('The name of the creator.'),
                email_address: z.string().describe('The email address of the creator.')
            })
            .passthrough()
            .describe('The person who created this column.'),
        description: z.string().nullable().optional().describe('The description of the column, or null if none.'),
        subscribers: z.array(z.object({}).passthrough()).optional().describe('List of subscribers to this column.'),
        color: z.string().nullable().optional().describe('The color of the column, or null if none.'),
        cards_count: z.number().describe('The number of cards in this column.'),
        comment_count: z.number().describe('The number of comments on this column.'),
        cards_url: z.string().describe('The API URL to list cards in this column.')
    })
    .describe('The card table column after removing its on-hold section.');

const ProviderColumnSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string(),
    subscription_url: z.string(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string(),
        url: z.string(),
        app_url: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: z
        .object({
            id: z.number(),
            name: z.string(),
            email_address: z.string()
        })
        .passthrough(),
    description: z.string().nullable().optional(),
    subscribers: z.array(z.object({}).passthrough()).optional(),
    color: z.string().nullable().optional(),
    cards_count: z.number(),
    comment_count: z.number(),
    cards_url: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Removes the on-hold section from a card table column, which clears any pending cards and is not automatically reversible.
 */
const action = createAction({
    description: 'Remove the on-hold section from a card table column',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
        const response = await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/columns/${encodeURIComponent(input.columnId)}/on_hold.json`,
            retries: 3
        });

        const providerColumn = ProviderColumnSchema.parse(response.data);

        return {
            id: providerColumn.id,
            status: providerColumn.status,
            visible_to_clients: providerColumn.visible_to_clients,
            created_at: providerColumn.created_at,
            updated_at: providerColumn.updated_at,
            title: providerColumn.title,
            inherits_status: providerColumn.inherits_status,
            type: providerColumn.type,
            url: providerColumn.url,
            app_url: providerColumn.app_url,
            bookmark_url: providerColumn.bookmark_url,
            subscription_url: providerColumn.subscription_url,
            parent: providerColumn.parent,
            bucket: providerColumn.bucket,
            creator: providerColumn.creator,
            description: providerColumn.description,
            subscribers: providerColumn.subscribers,
            color: providerColumn.color,
            cards_count: providerColumn.cards_count,
            comment_count: providerColumn.comment_count,
            cards_url: providerColumn.cards_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
