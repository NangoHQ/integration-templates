import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Name of the contact list to create. Example: "Magento Customer - ES"'),
        folderId: z.number().int().positive().describe('Id of the parent folder in which this list is to be created. Example: 1')
    })
    .describe('Parameters for creating a Brevo contact list');

const OutputSchema = z
    .object({
        id: z.number().int().describe('Id of the newly created contact list. Example: 5')
    })
    .describe('Result of creating a contact list');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact list in the provider, a provider-side mutation.
 * @pitfalls: The response contains only the new list's id; a follow-up get is needed for full list details. A list must live inside a folder, so folderId must reference an existing folder. A newly created list may not be immediately accepted as an email campaign's recipient list due to provider indexing lag, so allow a short delay before using it for a campaign.
 */
const action = createAction({
    description: 'Create a new contact list inside a folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/createlist-1
        const response = await nango.post({
            endpoint: '/contacts/lists',
            data: {
                name: input.name,
                folderId: input.folderId
            },
            // Not idempotent: no idempotency key, and retrying after a lost response would create a duplicate list.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate: creating a list is not idempotent.
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
