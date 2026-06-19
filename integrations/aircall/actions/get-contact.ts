import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('Contact ID. Example: "482393544"')
});

const EmailSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const PhoneNumberSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const ProviderContactSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    company_name: z.string().nullable(),
    information: z.string().nullable(),
    is_shared: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(EmailSchema),
    phone_numbers: z.array(PhoneNumberSchema)
});

const ProviderResponseSchema = z.object({
    contact: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    information: z.string().optional(),
    is_shared: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(EmailSchema),
    phone_numbers: z.array(PhoneNumberSchema)
});

const action = createAction({
    description: 'Retrieve a single contact from Aircall.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-contact' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.aircall.io/api-references/#retrieve-a-contact
        const response = await nango.get({
            endpoint: `/v1/contacts/${encodeURIComponent(input.contact_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contact_id: input.contact_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.contact;

        return {
            id: contact.id,
            direct_link: contact.direct_link,
            ...(contact.first_name != null && { first_name: contact.first_name }),
            ...(contact.last_name != null && { last_name: contact.last_name }),
            ...(contact.company_name != null && { company_name: contact.company_name }),
            ...(contact.information != null && { information: contact.information }),
            is_shared: contact.is_shared,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
            emails: contact.emails,
            phone_numbers: contact.phone_numbers
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
