import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the contact field to delete. Example: 24')
    })
    .describe('Input for deleting a contact field in Freshdesk');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact field and all associated data from Freshdesk.
 * @pitfalls: Deleting a contact field is irreversible and permanently removes all data stored in that field across every contact.
 */
const action = createAction({
    description: 'Delete a contact field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content returned on successful deletion'),

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developers.freshdesk.com/api/#delete_contact_field
            endpoint: `/api/v2/contact_fields/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
