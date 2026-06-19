import { z } from 'zod';
import { createAction } from 'nango';

const EmailInputSchema = z.object({
    email: z.string(),
    type: z.enum(['office', 'home', 'other'])
});

const PhoneInputSchema = z.object({
    phone: z.string(),
    type: z.enum(['office', 'home', 'mobile', 'direct', 'other'])
});

const UrlInputSchema = z.object({
    url: z.string(),
    type: z.string().optional()
});

const InputSchema = z.object({
    lead_id: z.string().describe('The ID of the lead to create the contact under. Example: lead_xxx'),
    name: z.string().optional().describe('The full name of the contact.'),
    title: z.string().optional().describe('The job title of the contact.'),
    emails: z.array(EmailInputSchema).optional().describe('Email addresses for the contact.'),
    phones: z.array(PhoneInputSchema).optional().describe('Phone numbers for the contact.'),
    urls: z.array(UrlInputSchema).optional().describe('URLs associated with the contact.')
});

const ProviderEmailSchema = z
    .object({
        email: z.string(),
        type: z.string(),
        is_unsubscribed: z.boolean().optional()
    })
    .passthrough();

const ProviderPhoneSchema = z
    .object({
        phone: z.string(),
        type: z.string(),
        country: z.string().nullable().optional(),
        phone_formatted: z.string().optional()
    })
    .passthrough();

const ProviderUrlSchema = z
    .object({
        url: z.string(),
        type: z.string()
    })
    .passthrough();

const ProviderContactSchema = z
    .object({
        id: z.string(),
        lead_id: z.string().nullable(),
        name: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        emails: z.array(ProviderEmailSchema).optional(),
        phones: z.array(ProviderPhoneSchema).optional(),
        urls: z.array(ProviderUrlSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    emails: z.array(ProviderEmailSchema).optional(),
    phones: z.array(ProviderPhoneSchema).optional(),
    urls: z.array(ProviderUrlSchema).optional()
});

const action = createAction({
    description: 'Create a contact under a lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.close.com/api/resources/contacts/create
            endpoint: '/v1/contact/',
            data: {
                lead_id: input.lead_id,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.emails !== undefined && { emails: input.emails }),
                ...(input.phones !== undefined && { phones: input.phones }),
                ...(input.urls !== undefined && { urls: input.urls })
            },
            retries: 10
        });

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            lead_id: providerContact.lead_id || '',
            ...(providerContact.name != null && { name: providerContact.name }),
            ...(providerContact.title != null && { title: providerContact.title }),
            ...(providerContact.emails !== undefined && { emails: providerContact.emails }),
            ...(providerContact.phones !== undefined && { phones: providerContact.phones }),
            ...(providerContact.urls !== undefined && { urls: providerContact.urls })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
