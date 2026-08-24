import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Ticket ID to delete. Example: 20')
    })
    .describe('Input to delete a Freshdesk ticket.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a ticket via the Freshdesk API. The ticket is soft-deleted and can be restored with the Restore Ticket API.
 * @pitfalls: Deletion is a soft-delete and the ticket remains restorable. Deleting an already-deleted or spam-marked ticket returns 405 Method Not Allowed.
 */
const action = createAction({
    description: 'Delete or archive a ticket in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null response indicating the ticket was successfully deleted.'),

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#delete_a_ticket
        await nango.delete({
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
