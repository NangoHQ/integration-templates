import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        folderId: z.number().int().positive().describe('ID of the contact folder to delete. Example: 2')
    })
    .describe('Input for deleting a Brevo contact folder.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Brevo confirmed the deletion (204 No Content).')
    })
    .describe('Result of the delete contact folder request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact folder, and every contact list inside it, with no way to recover them.
 * @pitfalls: Deleting a folder also permanently deletes every contact list inside it, and the deletion cannot be undone.
 */
const action = createAction({
    description: 'Delete a contact folder and all contact lists it contains.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/delete-folder
            endpoint: `/contacts/folders/${encodeURIComponent(input.folderId)}`,
            // Not retried: a retry after a lost 204 response would 404 on the already-deleted folder and surface a false failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
