import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const AddressSchema = z.object({
    attention: z.string().optional().describe('Name of the person the address belongs to.'),
    address: z.string().optional().describe('Street address line 1.'),
    street2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City name.'),
    state: z.string().optional().describe('State or province name.'),
    state_code: z.string().optional().describe('State or province code.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    country: z.string().optional().describe('Country name.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.')
});

const ContactPersonSchema = z.object({
    salutation: z.string().optional().describe('Salutation of the contact person, e.g. "Mr".'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    is_primary_contact: z.boolean().optional().describe('Whether this contact person is the primary contact.')
});

const CustomFieldSchema = z.object({
    index: z.number().optional().describe('Index of the custom field.'),
    value: z.string().optional().describe('Value of the custom field.')
});

const InputSchema = z
    .object({
        contact_name: z.string().min(1).max(200).describe('Display name of the contact. Maximum length 200 characters.'),
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Inventory organization ID. If omitted and the account has exactly one organization, it is used automatically.'),
        company_name: z.string().optional().describe('Company name of the contact.'),
        contact_type: z.enum(['customer', 'vendor']).optional().describe('Type of the contact: "customer" or "vendor".'),
        currency_id: z.union([z.string(), z.number()]).optional().describe('Currency ID to associate with the contact. Example: "260815000000000097".'),
        payment_terms: z.number().optional().describe('Payment terms in days. Example: 15 for Net 15.'),
        billing_address: AddressSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressSchema.optional().describe('Shipping address of the contact.'),
        contact_persons: z.array(ContactPersonSchema).optional().describe('Contact persons to associate with the contact.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values for the contact.')
    })
    .describe('Details of the contact to create.');

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
    contact: z.unknown().optional()
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique ID of the created contact.'),
        contact_name: z.string().describe('Display name of the created contact.'),
        company_name: z.string().optional().describe('Company name of the created contact.'),
        contact_type: z.string().optional().describe('Type of the created contact: "customer" or "vendor".'),
        email: z.string().optional().describe('Primary email address of the created contact.'),
        phone: z.string().optional().describe('Primary phone number of the created contact.'),
        status: z.string().optional().describe('Status of the created contact, e.g. "active".')
    })
    .describe('The newly created Zoho Inventory contact.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list to resolve organization_id when it is not supplied, then creates a contact.
 * @pitfalls: Zoho rejects creation when a contact with the same contact_name already exists, and omitting organization_id fails on accounts with more than one organization.
 */
const action = createAction({
    description: 'Create a customer or vendor contact in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId: string | undefined = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            const organizations = orgData.organizations ?? [];
            if (organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            if (organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            organizationId = organizations[0]?.organization_id;
            if (!organizationId) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
        }

        const body: Record<string, unknown> = {
            contact_name: input.contact_name,
            ...(input.company_name !== undefined && { company_name: input.company_name }),
            ...(input.contact_type !== undefined && { contact_type: input.contact_type }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.payment_terms !== undefined && { payment_terms: input.payment_terms }),
            ...(input.billing_address !== undefined && { billing_address: input.billing_address }),
            ...(input.shipping_address !== undefined && { shipping_address: input.shipping_address }),
            ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/contacts/#create-a-contact
            endpoint: '/inventory/v1/contacts',
            params: {
                organization_id: organizationId
            },
            data: body,
            // Contact creation is not idempotent and Zoho exposes no idempotency key, so retries are disabled to avoid duplicate contacts.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        const contact = ProviderContactSchema.parse(providerResponse.contact);

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
