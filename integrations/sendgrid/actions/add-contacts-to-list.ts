import { z } from 'zod';
import { createAction } from 'nango';

const ContactInputSchema = z.object({
    email: z.string().email().describe('Contact email address.'),
    id: z.string().optional().describe('Contact ID. Example: c6491580-2f4a-4339-8812-eb1f86aae6dd')
});

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list to add contacts to. Example: fa1dbbb4-10af-42d7-b07e-d1ab501a805b'),
    contacts: z.array(ContactInputSchema).min(1).describe('Contacts to add to the list.')
});

const ProviderResponseSchema = z.object({
    job_id: z.string()
});

const OutputSchema = z.object({
    job_id: z.string()
});

const action = createAction({
    description: 'Add existing contacts to a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.twilio.com/docs/sendgrid/api-reference/contacts/add-or-update-a-contact
            endpoint: '/v3/marketing/contacts',
            data: {
                list_ids: [input.list_id],
                contacts: input.contacts.map((contact) => ({
                    email: contact.email,
                    ...(contact.id !== undefined && { id: contact.id })
                }))
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'unexpected_error',
                message: 'No data returned from the SendGrid API.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job_id: providerResponse.job_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
