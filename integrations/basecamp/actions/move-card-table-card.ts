import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID containing the card table.'),
        cardId: z.number().describe('Card ID to move.'),
        columnId: z.number().describe('Destination column ID within the card table.'),
        position: z.number().optional().describe('1-indexed position within the destination column. Defaults to 1.')
    })
    .describe('Input for moving a card to a different column within a card table.');

/**
 * @tags: [write]
 * @tagReason: Mutates the card by changing its column and optionally its position.
 * @pitfalls: Passing a wormhole ID as columnId silently moves the card to a different project.
 */
const action = createAction({
    description: 'Move a card to a different column (and optionally a position within it).',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null on success.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        await nango.post({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_cards.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/cards/${encodeURIComponent(input.cardId)}/moves.json`,
            data: {
                column_id: input.columnId,
                ...(input.position !== undefined && { position: input.position })
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
