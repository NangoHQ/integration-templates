import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address_id: z.string().optional().describe('Unique identifier of the address.'),
    attention: z.string().optional().describe('Attention line for the address.'),
    address: z.string().optional().describe('Primary street address line.'),
    street2: z.string().optional().describe('Additional street address line.'),
    city: z.string().optional().describe('City of the address.'),
    state_code: z.string().optional().describe('State or province code of the address.'),
    state: z.string().optional().describe('State or province name of the address.'),
    zip: z.string().optional().describe('Postal or ZIP code of the address.'),
    country: z.string().optional().describe('Country name of the address.'),
    county: z.string().optional().describe('County of the address.'),
    country_code: z.string().optional().describe('Two-letter country code of the address.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.'),
    latitude: z.string().optional().describe('Latitude of the address, when provided.'),
    longitude: z.string().optional().describe('Longitude of the address, when provided.')
});

const ContactPersonSchema = z.object({
    contact_person_id: z.string().optional().describe('Unique identifier of the contact person.'),
    salutation: z.string().optional().describe('Salutation of the contact person, e.g. "Mr".'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    designation: z.string().optional().describe('Job designation of the contact person.'),
    department: z.string().optional().describe('Department the contact person belongs to.'),
    skype: z.string().optional().describe('Skype handle of the contact person.'),
    fax: z.string().optional().describe('Fax number of the contact person.'),
    is_primary_contact: z.boolean().optional().describe('Whether this person is the primary contact for the contact.'),
    is_added_in_portal: z.boolean().optional().describe('Whether this person has been added to the customer portal.'),
    can_invite: z.boolean().optional().describe('Whether this person can be invited to the customer portal.'),
    is_portal_invitation_accepted: z.boolean().optional().describe('Whether the customer portal invitation has been accepted.'),
    photo_url: z.string().optional().describe('URL of the contact person profile photo.')
});

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to retrieve. Example: "260815000000097001"'),
        organization_id: z
            .string()
            .describe(
                'Zoho organization ID that owns the contact. Required by the provider and required because it cannot be discovered with the scopes granted to this integration. Example: "927270289"'
            )
    })
    .describe('Identifies the Zoho Invoice contact to retrieve.');

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact.'),
        contact_name: z.string().describe('Display name of the contact, which can be a person or an organization.'),
        company_name: z.string().optional().describe('Company name associated with the contact.'),
        contact_type: z.string().optional().describe('Type of the contact, e.g. "customer" or "vendor".'),
        customer_sub_type: z.string().optional().describe('Customer sub-type, e.g. "business" or "individual".'),
        status: z.string().optional().describe('Status of the contact, e.g. "active" or "inactive".'),
        first_name: z.string().optional().describe('First name of the contact.'),
        last_name: z.string().optional().describe('Last name of the contact.'),
        email: z.string().optional().describe('Email address of the contact, derived from its primary contact person.'),
        phone: z.string().optional().describe('Phone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        website: z.string().optional().describe('Website of the contact.'),
        designation: z.string().optional().describe('Job designation of the contact.'),
        department: z.string().optional().describe('Department of the contact.'),
        language_code: z.string().optional().describe('Language code configured for the contact.'),
        currency_code: z.string().optional().describe('Currency code used for the contact, e.g. "USD".'),
        currency_symbol: z.string().optional().describe('Symbol of the currency used for the contact, e.g. "$".'),
        payment_terms: z.number().optional().describe('Net payment term in days for the contact.'),
        payment_terms_label: z.string().optional().describe('Human-readable label for the payment terms, e.g. "Due on Receipt".'),
        outstanding_receivable_amount: z.number().optional().describe('Total amount currently outstanding from this contact.'),
        outstanding_receivable_amount_bcy: z.number().optional().describe('Outstanding receivable amount in the organization base currency.'),
        unused_credits_receivable_amount: z.number().optional().describe('Unused credits available with this contact.'),
        unused_credits_receivable_amount_bcy: z.number().optional().describe('Unused credits available with this contact in the organization base currency.'),
        opening_balance_amount: z.number().optional().describe('Opening balance amount recorded for the contact.'),
        credit_limit_exceeded_amount: z.number().optional().describe('Amount by which the contact exceeds its configured credit limit.'),
        notes: z.string().optional().describe('Free-text notes recorded on the contact.'),
        portal_status: z.string().optional().describe('Customer portal status of the contact, e.g. "enabled" or "disabled".'),
        owner_name: z.string().optional().describe('Name of the user who owns the contact.'),
        sales_channel: z.string().optional().describe('Sales channel associated with the contact.'),
        created_time: z.string().optional().describe('Timestamp when the contact was created, in ISO-8601 format.'),
        last_modified_time: z.string().optional().describe('Timestamp when the contact was last modified, in ISO-8601 format.'),
        billing_address: AddressSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressSchema.optional().describe('Shipping address of the contact.'),
        addresses: z.array(AddressSchema).optional().describe('Additional addresses associated with the contact.'),
        contact_persons: z.array(ContactPersonSchema).optional().describe('Contact persons associated with the contact.')
    })
    .describe('A Zoho Invoice contact, including its contact persons, addresses, and outstanding balance summary.');

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    contact: OutputSchema.optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact and its related data from the provider without modifying any provider state.
 * @pitfalls: organization_id is required and omitting it makes the provider reject the request because it cannot be discovered with this integration's scopes; the top-level email reflects the primary contact person and is empty when no primary contact person exists.
 */
const action = createAction({
    description: 'Get a single contact by ID, including its contact persons, addresses, and outstanding balance summary.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/contacts/#get-a-contact
            endpoint: `/invoice/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.contact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contact_id: input.contact_id
            });
        }

        return parsed.contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
