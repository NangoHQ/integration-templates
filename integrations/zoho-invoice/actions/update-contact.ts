import { z } from 'zod';
import { createAction } from 'nango';

const AddressInputSchema = z.object({
    attention: z.string().optional().describe('Attention line of the contact\'s address. Example: "Accounts Payable"'),
    address: z.string().optional().describe('Street address of the contact. Maximum length 500.'),
    street2: z.string().optional().describe('Additional street address of the contact.'),
    city: z.string().optional().describe('City of the address. Example: "Springfield"'),
    state: z.string().optional().describe('State of the address. Example: "IL"'),
    state_code: z.string().optional().describe('State code of the address. Example: "IL"'),
    zip: z.string().optional().describe('ZIP or postal code of the address. Example: "62701"'),
    country: z.string().optional().describe('Country of the address. Example: "U.S.A"'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.')
});

const ContactPersonInputSchema = z.object({
    salutation: z.string().optional().describe('Salutation for the contact person. Example: "Mr"'),
    first_name: z.string().optional().describe('First name of the contact person. Maximum length 100.'),
    last_name: z.string().optional().describe('Last name of the contact person. Maximum length 100.'),
    email: z
        .string()
        .optional()
        .describe(
            "Email of the contact person. The contact's displayed top-level email comes from its primary contact person, so set it here rather than on a top-level email field."
        ),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    is_primary_contact: z
        .literal(true)
        .optional()
        .describe('Set to true to make this person the primary contact for the contact. Zoho only accepts true; omit the field otherwise.')
});

const CustomFieldInputSchema = z.object({
    index: z.number().int().optional().describe('Index of the custom field, from 1 to 10.'),
    label: z.string().optional().describe('Label of the custom field.'),
    value: z.string().optional().describe('Value of the custom field.')
});

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to update. Example: "260815000000097001"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID that owns the contact. Required on every call; this connection cannot look it up because it lacks the settings scope. Example: "927270289"'
            ),
        contact_name: z.string().describe('New name of the contact (organisation or individual). Required by the provider. Maximum length 200.'),
        contact_type: z.enum(['customer', 'vendor']).optional().describe('Type of the contact: "customer" or "vendor".'),
        company_name: z.string().optional().describe('Company name of the contact. Maximum length 200.'),
        website: z.string().optional().describe('Website of the contact. Example: "https://example.com"'),
        language_code: z.string().optional().describe('Language of the contact. One of "de", "en", "es", "fr", "it", "ja", "nl", "pt", "sv", "zh".'),
        notes: z.string().optional().describe('Free-text notes about the contact.'),
        payment_terms: z.number().int().optional().describe('Net payment term in days for the customer. Example: 15'),
        currency_id: z.string().optional().describe('Currency ID of the contact\'s currency. Example: "260815000000000097"'),
        billing_address: AddressInputSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressInputSchema.optional().describe('Shipping address of the contact.'),
        contact_persons: z
            .array(ContactPersonInputSchema)
            .optional()
            .describe('Contact persons of the contact. Passing this list replaces the entire existing list, so any person omitted is removed by the provider.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom fields for the contact.'),
        facebook: z.string().optional().describe('Facebook profile of the contact. Maximum length 100.'),
        twitter: z.string().optional().describe('Twitter handle of the contact. Maximum length 100.')
    })
    .describe('Fields to update on an existing Zoho Invoice contact, including its name, type, contact persons, and addresses.');

const AddressOutputSchema = z.object({
    address_id: z.string().optional().describe('Unique identifier of the address record.'),
    attention: z.string().optional().describe("Attention line of the contact's address."),
    address: z.string().optional().describe('Street address of the contact.'),
    street2: z.string().optional().describe('Additional street address of the contact.'),
    city: z.string().optional().describe('City of the address.'),
    state: z.string().optional().describe('State of the address.'),
    state_code: z.string().optional().describe('State code of the address.'),
    zip: z.string().optional().describe('ZIP or postal code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.')
});

const ContactPersonOutputSchema = z.object({
    contact_person_id: z.string().optional().describe('Unique identifier of the contact person.'),
    salutation: z.string().optional().describe('Salutation for the contact person.'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    is_primary_contact: z.boolean().optional().describe('Whether this person is the primary contact.')
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the updated contact.'),
        contact_name: z.string().describe('Name of the updated contact.'),
        contact_type: z.string().optional().describe('Type of the contact, such as "customer" or "vendor".'),
        company_name: z.string().optional().describe('Company name of the contact.'),
        email: z.string().optional().describe('Top-level email of the contact, derived from its primary contact person.'),
        phone: z.string().optional().describe('Phone number of the contact.'),
        website: z.string().optional().describe('Website of the contact.'),
        language_code: z.string().optional().describe('Language of the contact.'),
        notes: z.string().optional().describe('Free-text notes about the contact.'),
        status: z.string().optional().describe('Status of the contact, such as "active" or "inactive".'),
        payment_terms: z.number().optional().describe('Net payment term in days for the customer.'),
        currency_code: z.string().optional().describe('Currency code of the contact. Example: "USD"'),
        billing_address: AddressOutputSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressOutputSchema.optional().describe('Shipping address of the contact.'),
        contact_persons: z.array(ContactPersonOutputSchema).describe('Contact persons of the contact after the update.'),
        last_modified_time: z.string().optional().describe('Time the contact was last modified, in ISO-8601 format.')
    })
    .describe('The updated Zoho Invoice contact, including its addresses and contact persons.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing contact via a provider PUT, mutating contact fields, addresses, and contact persons.
 * @pitfalls: The provider silently ignores a top-level email field; the displayed email comes only from the primary contact_persons entry. Passing contact_persons replaces the entire list, so any existing person omitted from the array is removed.
 */
const action = createAction({
    description: 'Update an existing contact (name, type, contact persons, and addresses).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            contact_name: input.contact_name
        };

        if (input.contact_type !== undefined) {
            data['contact_type'] = input.contact_type;
        }
        if (input.company_name !== undefined) {
            data['company_name'] = input.company_name;
        }
        if (input.website !== undefined) {
            data['website'] = input.website;
        }
        if (input.language_code !== undefined) {
            data['language_code'] = input.language_code;
        }
        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.payment_terms !== undefined) {
            data['payment_terms'] = input.payment_terms;
        }
        if (input.currency_id !== undefined) {
            data['currency_id'] = input.currency_id;
        }
        if (input.billing_address !== undefined) {
            data['billing_address'] = input.billing_address;
        }
        if (input.shipping_address !== undefined) {
            data['shipping_address'] = input.shipping_address;
        }
        if (input.contact_persons !== undefined) {
            data['contact_persons'] = input.contact_persons;
        }
        if (input.custom_fields !== undefined) {
            data['custom_fields'] = input.custom_fields;
        }
        if (input.facebook !== undefined) {
            data['facebook'] = input.facebook;
        }
        if (input.twitter !== undefined) {
            data['twitter'] = input.twitter;
        }

        const response = await nango.put({
            // https://www.zoho.com/invoice/api/v3/contacts/#update-a-contact
            endpoint: `invoice/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data,
            retries: 3
        });

        const envelope = z
            .object({
                contact: OutputSchema
            })
            .parse(response.data);

        return envelope.contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
