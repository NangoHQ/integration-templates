import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    tags: z.array(z.string()).describe('Tags to remove from the contact. Example: ["tag1", "tag2"]')
});

const ProviderResponseSchema = z.object({
    tags: z.array(z.string())
});

const OutputSchema = z.object({
    tags: z.array(z.string()).describe('Remaining tags on the contact after removal.')
});

const action = createAction({
    description: 'Remove one or more tags from a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/Contacts/remove-tags
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tags`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                tags: input.tags
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or tags could not be removed.',
                contactId: input.contactId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            tags: providerResponse.tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
