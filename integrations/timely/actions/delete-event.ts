import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('Timely account ID that owns the time entry. Example: "1145787"'),
        event_id: z.string().describe('ID of the logged time entry (event) to delete. Example: "297113615"')
    })
    .describe('Input for permanently deleting a single logged time entry.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the time entry was deleted successfully.'),
        event_id: z.string().describe('ID of the time entry that was deleted. Example: "297113615"')
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
        // DELETE by ID is idempotent, so retrying a failed request is safe.
        const response = await nango.delete({
            endpoint: `/1.1/${encodeURIComponent(input.account_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        return {
            deleted: response.status >= 200 && response.status < 300,
            event_id: input.event_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
