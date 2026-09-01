import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('Ticket ID that contains the message to delete.'),
        id: z.number().describe('Message ID to delete.')
    })
    .describe('Delete ticket message input.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a message from a ticket via the provider API.
 */
const action = createAction({
    description: 'Delete a message from a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content response'),
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developers.gorgias.com/reference/delete-ticket-message
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/messages/${encodeURIComponent(input.id)}`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
