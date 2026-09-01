import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the ticket to delete.')
    })
    .describe('Input for deleting a ticket.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the ticket permanently via the provider API.
 * @pitfalls: Deleting a ticket is a hard delete (not a move to trash) that permanently removes its messages and tag associations with no undo.
 */
const action = createAction({
    description: 'Delete a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the ticket was deleted successfully.'),
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/delete-ticket
        await nango.delete({
            endpoint: `/api/tickets/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
