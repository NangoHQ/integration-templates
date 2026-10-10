import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z
            .number()
            .int()
            .positive()
            .describe('Timely account ID that owns the time entry. Discover it with the list-accounts action. Example: 1145787'),
        event_id: z.number().int().positive().describe('ID of the logged time entry (event) to delete. Example: 297113615')
    })
    .describe('Input for permanently deleting a single logged time entry.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the time entry was deleted successfully.'),
        event_id: z.number().int().describe('ID of the time entry that was deleted. Example: 297113615')
    })
    .describe('Result of deleting a logged time entry.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a logged time entry from the provider via its delete endpoint.
 * @pitfalls: Deletion is permanent and cannot be undone, and the action fails with a not-found error if the time entry does not exist or was already deleted.
 */
const action = createAction({
    description: 'Permanently delete a single logged time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.timely.com/
        const response = await nango.delete({
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/events/${encodeURIComponent(String(input.event_id))}`,
            // Not retry-safe: if Timely deletes the event but the response is lost, a retry gets a 404
            // and the action would report failure for a deletion that actually succeeded.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            deleted: response.status >= 200 && response.status < 300,
            event_id: input.event_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
