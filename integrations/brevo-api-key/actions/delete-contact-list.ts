import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().positive().describe('ID of the contact list to delete. Example: 2')
    })
    .describe('Input for deleting a Brevo contact list.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True if the contact list was deleted successfully.')
    })
    .describe('Result of deleting a Brevo contact list.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a Brevo contact list by ID, a destructive provider mutation.
 * @pitfalls: Deleting a list is permanent and takes effect immediately. Contacts in the list are not deleted; they are only removed from it. The action fails with a 404 not-found error if the list ID does not exist.
 */
const action = createAction({
    description: 'Delete a contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/delete-list
            endpoint: `/contacts/lists/${encodeURIComponent(input.id)}`,
            // Retries are safe here: DELETE by ID is idempotent, so a retry after a lost response has no additional effect (the list is already gone).
            retries: 3
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
