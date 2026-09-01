import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project (bucket) containing the card table.'),
        cardTableId: z.number().describe('The ID of the card table whose column is being moved.'),
        sourceId: z.number().describe('The ID of the column to move.'),
        targetId: z.number().describe('The ID of the card table to move the column within (typically the same as cardTableId).'),
        position: z.number().optional().describe('The target position index among non-Triage/Not-Now/Done columns. Defaults to 1.')
    })
    .describe('Input to move a card table column.');

const OutputSchema = z.null().describe('Output of moving a card table column.');

/**
 * @tags: [write]
 * @tagReason: Reposition a column within its Card Table.
 * @pitfalls: position counts only among custom columns; built-in columns such as Triage, Not Now, and Done are always fixed and excluded.
 */
const action = createAction({
    description: 'Reposition a column within its Card Table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_tables.md
        await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/card_tables/${encodeURIComponent(String(input.cardTableId))}/moves.json`,
            data: {
                source_id: input.sourceId,
                target_id: input.targetId,
                position: input.position ?? 1
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
