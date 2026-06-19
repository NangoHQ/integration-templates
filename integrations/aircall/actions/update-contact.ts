import { z } from 'zod';
import { createAction } from 'nango';

const PhoneNumberInputSchema = z.object({
    label: z.string().describe('Label for the phone number. Example: "Work"'),
    value: z.string().describe('The raw phone number. Example: "+19001112222"')
});

const EmailInputSchema = z.object({
    label: z.string().describe('Label for the email. Example: "Office"'),
    value: z.string().describe('The email address. Example: "gary.jennings@acme.com"')
});

const InputSchema = z.object({
    id: z.number().describe('Contact ID. Example: 482393544'),
    first_name: z.string().optional().describe('Contact first name.'),
    last_name: z.string().optional().describe('Contact last name.'),
    company_name: z.string().optional().describe('Contact company name.'),
    information: z.string().optional().describe('Extra information about the contact.'),
    phone_numbers: z.array(PhoneNumberInputSchema).optional().describe('Phone numbers for the contact.'),
    emails: z.array(EmailInputSchema).optional().describe('Email addresses for the contact.')
});

const ProviderPhoneNumberSchema = z.object({
    id: z.number().optional(),
    label: z.string().nullable().optional(),
    value: z.string()
});

const ProviderEmailSchema = z.object({
    id: z.number().optional(),
    label: z.string().nullable().optional(),
    value: z.string()
});

const ProviderContactSchema = z
    .object({
        id: z.number(),
        direct_link: z.string().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        information: z.string().nullable().optional(),
        is_shared: z.boolean().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        phone_numbers: z.array(ProviderPhoneNumberSchema).optional(),
        emails: z.array(ProviderEmailSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    contact: ProviderContactSchema
});

const action = createAction({
    description: 'Update a contact in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/update-contact',
        method: 'POST'
    },
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contactId = input.id;

        // https://developer.aircall.io/api-references/#retrieve-a-contact
        const getResponse = await nango.get({
            endpoint: `/v1/contacts/${encodeURIComponent(String(contactId))}`,
            retries: 3
        });

        if (!getResponse.data || typeof getResponse.data !== 'object' || !('contact' in getResponse.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or unexpected response format.',
                contact_id: contactId
            });
        }

        const existingContact = ProviderContactSchema.parse(getResponse.data.contact);

        const body = {
            first_name: input.first_name !== undefined ? input.first_name : existingContact.first_name,
            last_name: input.last_name !== undefined ? input.last_name : existingContact.last_name,
            company_name: input.company_name !== undefined ? input.company_name : existingContact.company_name,
            information: input.information !== undefined ? input.information : existingContact.information,
            phone_numbers: input.phone_numbers !== undefined ? input.phone_numbers : existingContact.phone_numbers,
            emails: input.emails !== undefined ? input.emails : existingContact.emails
        };

        // https://developer.aircall.io/api-references/#update-a-contact
        const response = await nango.post({
            endpoint: `/v1/contacts/${encodeURIComponent(String(contactId))}`,
            data: body,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('contact' in response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from update contact endpoint.',
                contact_id: contactId
            });
        }

        const updatedContact = ProviderContactSchema.parse(response.data.contact);

        return {
            contact: updatedContact
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
