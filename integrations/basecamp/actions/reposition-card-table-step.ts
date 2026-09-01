import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the Basecamp project (bucket) containing the card.'),
        cardId: z.string().describe('The ID of the card table card whose step is being repositioned.'),
        stepId: z.string().describe('The ID of the step to reposition.'),
        position: z.number().int().min(0).describe('The zero-indexed target position for the step within the card.')
    })
    .describe('Input for repositioning a card table step within its card.');

const OutputSchema = z.null().describe('Action succeeds with no content returned.');

/**
 * @tags: [write]
 * @tagReason: Mutates the position of a card-table step within its card.
 * @pitfalls: A 404 may indicate the card or step is missing, insufficient permissions, or an inactive account (check the Reason response header).
 */
const action = createAction({
    description: 'Change the position of a step within its card.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_steps.md
        await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/cards/${encodeURIComponent(input.cardId)}/positions.json`,
            data: {
                source_id: input.stepId,
                position: input.position
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
