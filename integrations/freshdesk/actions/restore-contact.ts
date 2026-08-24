import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().describe('The unique identifier of the soft-deleted contact to restore. Example: 432')
    })
    .describe('Input for restoring a soft-deleted Freshdesk contact.');

/**
 * @tags: [write]
 * @tagReason: Restores a soft-deleted contact on the Freshdesk account.
 * @pitfalls: Returns 404 when the contact is not currently soft-deleted; repeated restores are not idempotent.
 */
const action = createAction({
    description: 'Restore a soft-deleted Freshdesk contact.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty success response indicating the contact was restored.'),

    exec: async (nango, input): Promise<null> => {
        await nango.put({
            // https://developers.freshdesk.com/api/#restore_contact
            endpoint: `/api/v2/contacts/${encodeURIComponent(String(input.id))}/restore`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
