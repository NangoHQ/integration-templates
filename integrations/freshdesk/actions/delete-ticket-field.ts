import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the custom ticket field to delete.')
    })
    .describe('Input for deleting a Freshdesk ticket field.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a custom ticket field from the Freshdesk account.
 * @pitfalls: System default ticket fields cannot be deleted; only custom fields are removable.
 */
const action = createAction({
    description: 'Delete a ticket field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the ticket field was successfully deleted.'),

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#ticket_fields
        await nango.delete({
            endpoint: `/api/v2/admin/ticket_fields/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
