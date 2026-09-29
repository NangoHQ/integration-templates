import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier (GUID) of the contact to delete. Example: "1f2cf6c4-6c3b-4f2a-9d2e-7a1b3c4d5e6f".')
    })
    .describe('Input for deleting a contact.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the contact was deleted successfully.')
    })
    .describe('Result of the contact deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact record in Dataverse, an irreversible provider-side mutation.
 * @pitfalls: Deletion is immediate and permanent with no recycle bin; deleting a contact that does not exist or was already deleted fails with a 404 error.
 */
const action = createAction({
    description: 'Delete a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
            endpoint: `/api/data/v9.2/contacts(${encodeURIComponent(input.id)})`,
            retries: 3
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
