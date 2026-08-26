import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) that contains the card table.'),
        columnId: z.number().describe('The ID of the card table column to add the on-hold section to.')
    })
    .describe('Input to add an on-hold section to a card table column.');

const OnHoldSchema = z
    .object({
        id: z.number().describe('The ID of the on-hold section.'),
        title: z.string().describe('The title of the on-hold section, typically "On hold".'),
        cards_count: z.number().describe('The number of cards currently in the on-hold section.'),
        cards_url: z.string().describe('The URL to fetch cards in the on-hold section.')
    })
    .describe('The on-hold section within a card table column, used to visually pause cards.');

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the card table column.'),
        title: z.string().describe('The title of the column.'),
        cards_count: z.number().describe('The number of cards in the main column.'),
        cards_url: z.string().describe('The URL to fetch cards in the main column.'),
        on_hold: OnHoldSchema.describe('The on-hold section added to the column.')
    })
    .passthrough()
    .describe('Card table column with its newly created on-hold section.');

/**
 * @tags: [write]
 * @tagReason: Posts to the provider API to create an on-hold section in a card table column.
 * @pitfalls: The endpoint is create-only; calling it again on a column that already has an on-hold section will fail.
 */
const action = createAction({
    description: 'Add an on-hold section to a Card Table column (used to visually pause cards within a column).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/columns/${encodeURIComponent(input.columnId)}/on_hold.json`,
            retries: 3
        });

        const column = OutputSchema.parse(response.data);
        return column;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
