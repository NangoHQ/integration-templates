import { z } from 'zod';
import { createAction } from 'nango';

const ContactEmailInputSchema = z.object({
    email: z.string(),
    type: z.string().optional()
});

const ContactPhoneInputSchema = z.object({
    phone: z.string(),
    type: z.string().optional()
});

const ContactUrlInputSchema = z.object({
    url: z.string(),
    type: z.string().optional()
});

const ContactInputSchema = z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    emails: z.array(ContactEmailInputSchema).optional(),
    phones: z.array(ContactPhoneInputSchema).optional(),
    urls: z.array(ContactUrlInputSchema).optional()
});

const AddressInputSchema = z.object({
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    label: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional()
});

const InputSchema = z.object({
    name: z.string(),
    status_id: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    addresses: z.array(AddressInputSchema).optional(),
    contacts: z.array(ContactInputSchema).optional()
});

const LeadAddressSchema = z.object({
    address_1: z.string().nullable(),
    address_2: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    label: z.string().nullable(),
    state: z.string().nullable(),
    zipcode: z.string().nullable(),
    tz_ids: z.array(z.string()).optional()
});

const ContactEmailSchema = z.object({
    email: z.string(),
    type: z.string(),
    is_unsubscribed: z.boolean().optional()
});

const ContactPhoneSchema = z.object({
    phone: z.string(),
    type: z.string(),
    phone_formatted: z.string().optional(),
    country: z.string().nullable().optional(),
    tz_ids: z.array(z.string()).optional()
});

const ContactUrlSchema = z.object({
    url: z.string(),
    type: z.string()
});

const ContactSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    title: z.string().nullable(),
    display_name: z.string(),
    lead_id: z.string().nullable(),
    organization_id: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    created_by: z.string().nullable(),
    updated_by: z.string().nullable(),
    emails: z.array(ContactEmailSchema).optional(),
    phones: z.array(ContactPhoneSchema).optional(),
    urls: z.array(ContactUrlSchema).optional()
});

const LeadSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    display_name: z.string(),
    status_id: z.string(),
    status_label: z.string(),
    organization_id: z.string(),
    url: z.string().nullable(),
    description: z.string().nullable(),
    date_created: z.string(),
    date_updated: z.string(),
    created_by: z.string().nullable(),
    updated_by: z.string().nullable(),
    html_url: z.string(),
    addresses: z.array(LeadAddressSchema).optional(),
    contacts: z.array(ContactSchema).optional(),
    contact_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    display_name: z.string(),
    status_id: z.string(),
    status_label: z.string(),
    organization_id: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    html_url: z.string(),
    addresses: z.array(LeadAddressSchema).optional(),
    contacts: z.array(ContactSchema).optional(),
    contact_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a Close lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.close.com/api/resources/leads/create
            endpoint: '/v1/lead/',
            data: {
                name: input.name,
                ...(input.status_id !== undefined && { status_id: input.status_id }),
                ...(input.url !== undefined && { url: input.url }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.addresses !== undefined && { addresses: input.addresses }),
                ...(input.contacts !== undefined && { contacts: input.contacts })
            },
            retries: 3
        });

        const lead = LeadSchema.parse(response.data);

        return {
            id: lead.id,
            ...(lead.name != null && { name: lead.name }),
            display_name: lead.display_name,
            status_id: lead.status_id,
            status_label: lead.status_label,
            organization_id: lead.organization_id,
            ...(lead.url != null && { url: lead.url }),
            ...(lead.description != null && { description: lead.description }),
            date_created: lead.date_created,
            date_updated: lead.date_updated,
            html_url: lead.html_url,
            ...(lead.addresses !== undefined && { addresses: lead.addresses }),
            ...(lead.contacts !== undefined && { contacts: lead.contacts }),
            ...(lead.contact_ids !== undefined && { contact_ids: lead.contact_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
