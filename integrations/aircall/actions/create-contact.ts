import { z } from 'zod';
import { createAction } from 'nango';

const PhoneNumberInputSchema = z.object({
    label: z.string(),
    value: z.string()
});

const EmailInputSchema = z.object({
    label: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    information: z.string().optional(),
    phone_numbers: z.array(PhoneNumberInputSchema).optional(),
    emails: z.array(EmailInputSchema).optional()
});

const ProviderPhoneNumberSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const ProviderEmailSchema = z.object({
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
    emails: z.array(ProviderEmailSchema),
    phone_numbers: z.array(ProviderPhoneNumberSchema)
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
    emails: z.array(ProviderEmailSchema),
    phone_numbers: z.array(ProviderPhoneNumberSchema)
});

const action = createAction({
    description: 'Create a contact in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/create-contact',
        method: 'POST'
    },
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.aircall.io/api-references/#create-a-contact
            endpoint: '/v1/contacts',
            data: {
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.information !== undefined && { information: input.information }),
                ...(input.phone_numbers !== undefined && { phone_numbers: input.phone_numbers }),
                ...(input.emails !== undefined && { emails: input.emails })
            },
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const contact = providerResponse.contact;

        return {
            id: contact.id,
            direct_link: contact.direct_link,
            is_shared: contact.is_shared,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
            emails: contact.emails,
            phone_numbers: contact.phone_numbers,
            ...(contact.first_name != null && { first_name: contact.first_name }),
            ...(contact.last_name != null && { last_name: contact.last_name }),
            ...(contact.company_name != null && { company_name: contact.company_name }),
            ...(contact.information != null && { information: contact.information })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
