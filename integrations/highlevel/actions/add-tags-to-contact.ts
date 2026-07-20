import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    tags: z.array(z.string()).describe('Tags to add to the contact. Example: ["nango-test-tag"]')
});

const ProviderResponseSchema = z.object({
    tags: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    contactId: z.string(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Add one or more tags to a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/844ebf7d299d2-add-tags
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tags`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                tags: input.tags
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            contactId: input.contactId,
            ...(providerResponse.tags !== undefined && { tags: providerResponse.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
