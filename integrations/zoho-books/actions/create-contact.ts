import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    attention: z.string().optional(),
    address: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    state_code: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    fax: z.string().optional(),
    phone: z.string().optional()
});

const InputSchema = z.object({
    contact_name: z.string().min(1).max(200).describe('Display name of the contact. Max-length [200].'),
    company_name: z.string().optional().describe('Company name of the contact. Max-length [200].'),
    contact_type: z.enum(['customer', 'vendor']).optional().describe('Type of contact: customer or vendor.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    website: z.string().optional().describe('Website of the contact.'),
    billing_address: AddressSchema.optional().describe('Billing address of the contact.'),
    shipping_address: AddressSchema.optional().describe('Shipping address of the contact.')
});

const ProviderContactSchema = z.object({
    contact_id: z.union([z.string(), z.number()]).transform((val) => String(val)),
    contact_name: z.string(),
    company_name: z.string().optional().nullable(),
    contact_type: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    status: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    contact: z.unknown()
});

const OutputSchema = z.object({
    contact_id: z.string().describe('Unique ID of the created contact.'),
    contact_name: z.string().describe('Display name of the contact.'),
    company_name: z.string().optional().describe('Company name of the contact.'),
    contact_type: z.string().optional().describe('Type of contact: customer or vendor.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    status: z.string().optional().describe('Status of the contact.')
});

const action = createAction({
    description: 'Create a contact in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.contacts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const typedMetadata = z.object({ organization_id: z.union([z.string(), z.number()]) }).safeParse(metadata);

        if (!typedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organizationId = typedMetadata.data.organization_id;

        const body: Record<string, unknown> = {
            contact_name: input.contact_name,
            ...(input.company_name !== undefined && { company_name: input.company_name }),
            ...(input.contact_type !== undefined && { contact_type: input.contact_type }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.website !== undefined && { website: input.website }),
            ...(input.billing_address !== undefined && { billing_address: input.billing_address }),
            ...(input.shipping_address !== undefined && { shipping_address: input.shipping_address })
        };

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/contacts/#create-a-contact
            endpoint: '/books/v3/contacts',
            params: {
                organization_id: String(organizationId)
            },
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books API.',
                details: providerResponse.error.message
            });
        }

        if (providerResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.data.message,
                code: providerResponse.data.code
            });
        }

        const contactResult = ProviderContactSchema.safeParse(providerResponse.data.contact);
        if (!contactResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected contact shape in Zoho Books API response.',
                details: contactResult.error.message
            });
        }

        const contact = contactResult.data;

        return {
            contact_id: contact.contact_id,
            contact_name: contact.contact_name,
            ...(contact.company_name != null && { company_name: contact.company_name }),
            ...(contact.contact_type != null && { contact_type: contact.contact_type }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.status != null && { status: contact.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
