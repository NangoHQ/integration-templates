import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        listId: z.number().int().positive().describe('Id of the contact list to update. Example: 2'),
        name: z.string().min(1).optional().describe('New name for the list. At least one of name or folderId must be provided.'),
        folderId: z.number().int().positive().optional().describe('Id of the folder to move the list into. At least one of name or folderId must be provided.')
    })
    .describe('Input for renaming a contact list or moving it to a different folder. At least one of name or folderId must be provided.');

const OutputSchema = z
    .object({ success: z.boolean().describe('True when the contact list was updated successfully.') })
    .describe('Result of the contact list update.');

/**
 * @tags: [write]
 * @tagReason: Updates a contact list's name and/or folder through the provider API.
 * @pitfalls: The provider returns 204 No Content with no body on success, so the updated list is not echoed back; fetch the list separately if the new state is needed. Renaming to the list's current name is rejected with a 400 error, so the new name must differ from the existing one.
 */
const action = createAction({
    description: 'Rename a contact list or move it to a different folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.folderId === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of name or folderId must be provided to update a contact list.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/updatelist
            endpoint: `/contacts/lists/${encodeURIComponent(input.listId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.folderId !== undefined && { folderId: input.folderId })
            },
            // Not retried: a retry after a lost success response would resend the same name, which Brevo rejects with a 400 since the name no longer differs, misreporting a completed rename as an error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        await nango.put(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
