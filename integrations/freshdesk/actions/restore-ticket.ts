import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The display ID of the ticket to restore. Example: 1')
    })
    .describe('Input to restore a deleted Freshdesk ticket.');

const OutputSchema = z
    .object({
        id: z.number().describe('The display ID of the restored ticket.')
    })
    .describe('Confirmation that the ticket was restored.');

/**
 * @tags: [write]
 * @tagReason: Restores a previously soft-deleted ticket on the provider, mutating its state.
 * @pitfalls: Freshdesk rate limits vary by plan and trial accounts allow as few as 50 requests per minute, which can cause 429 errors under load.
 */
const action = createAction({
    description: 'Restore a deleted Freshdesk ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.put({
            // https://developers.freshdesk.com/api/#restore_a_ticket
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.id))}/restore`,
            retries: 3
        });

        return { id: input.id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
