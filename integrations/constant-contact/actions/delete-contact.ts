import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.string().describe('The unique ID of the contact to delete. Example: "7f3e2a1b-4c5d-6e7f-8a9b-0c1d2e3f4a5b"')
    })
    .describe('Parameters for deleting a contact.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the contact was deleted successfully.')
    })
    .describe('Result of the delete contact request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact by ID through the provider's delete endpoint.
 * @pitfalls: A deleted contact disappears from contact listings immediately but remains fetchable by ID for some time, returned with a deleted_at marker, so a successful follow-up fetch does not mean the deletion failed. Deleting an unknown or already-deleted ID fails with a 404 error.
 */
const action = createAction({
    description: 'Delete a contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            // Safe to retry: deleting an already-deleted contact is a no-op that returns 404, so a retry can never repeat the mutation.
            retries: 3
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
