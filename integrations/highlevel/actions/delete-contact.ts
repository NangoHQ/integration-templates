import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('The ID of the contact to delete. Example: "jKy701hlSIPdiw0x12WA"')
});

const ProviderResponseSchema = z
    .object({
        succeeded: z.boolean().optional(),
        succeded: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    contactId: z.string()
});

const action = createAction({
    description: 'Delete a contact in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/84464c9af05f5-delete-contact
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.succeeded ?? providerResponse.succeded ?? true,
            contactId: input.contactId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
