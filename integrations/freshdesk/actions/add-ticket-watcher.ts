import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('Freshdesk ticket ID to add the watcher to.'),
        user_id: z.number().describe('Freshdesk agent ID to add as a watcher.')
    })
    .describe('Input to add an agent watcher to a Freshdesk ticket.');

/**
 * @tags: [write]
 * @tagReason: Mutates the ticket on the provider by adding a watcher.
 * @pitfalls: Re-adding the same agent watcher to a ticket returns HTTP 409 with a duplicate_value error instead of succeeding idempotently.
 */
const action = createAction({
    description: 'Add a watcher (agent) to a Freshdesk ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the watcher was added successfully.'),

    exec: async (nango, input): Promise<null> => {
        await nango.post({
            // https://developers.freshdesk.com/api/#add_watcher
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.ticket_id))}/watch`,
            data: {
                user_id: input.user_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
