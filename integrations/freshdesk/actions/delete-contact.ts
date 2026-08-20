import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Freshdesk contact ID to soft-delete. Example: 123456789')
    })
    .describe('Input to soft-delete a Freshdesk contact.');

/**
 * @tags: [write, destructive]
 * @tagReason: Soft-deletes a contact on the provider; the contact becomes inaccessible and associated tickets are unassigned.
 * @pitfalls: This action performs a soft delete so the contact remains restorable; re-invoking it on an already deleted or blocked contact returns 405 Method Not Allowed.
 */
const action = createAction({
    description: 'Delete or archive a contact in Freshdesk.',
    version: '3.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the contact was soft-deleted successfully.'),

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#delete_contact
        await nango.delete({
            endpoint: `/api/v2/contacts/${encodeURIComponent(input.id)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
