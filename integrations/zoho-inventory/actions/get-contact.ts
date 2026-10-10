import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const AddressSchema = z
    .object({
        address_id: z.string().optional().describe('Unique identifier of the address.'),
        attention: z.string().optional().describe('Name of the person to whom documents should be addressed.'),
        address: z.string().optional().describe('First line of the street address.'),
        street2: z.string().optional().describe('Second line of the street address.'),
        city: z.string().optional().describe('City name.'),
        state: z.string().optional().describe('State or province name.'),
        state_code: z.string().optional().describe('State or province code.'),
        zip: z.string().optional().describe('Postal or ZIP code.'),
        country: z.string().optional().describe('Country name.'),
        county: z.string().optional().describe('County name.'),
        country_code: z.string().optional().describe('Two-letter ISO country code.'),
        phone: z.string().optional().describe('Phone number associated with the address.'),
        fax: z.string().optional().describe('Fax number associated with the address.'),
        latitude: z.string().optional().describe('Latitude of the address location.'),
        longitude: z.string().optional().describe('Longitude of the address location.')
    })
    .passthrough();

const TagSchema = z
    .object({
        tag_id: z.string().optional().describe('Unique identifier of the tag.'),
        tag_name: z.string().optional().describe('Display name of the tag.')
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.string().optional().describe('Unique identifier of the contact person.'),
        salutation: z.string().optional().describe('Salutation, such as Mr. or Ms.'),
        first_name: z.string().optional().describe('First name of the contact person.'),
        last_name: z.string().optional().describe('Last name of the contact person.'),
        email: z.string().optional().describe('Email address of the contact person.'),
        phone: z.string().optional().describe('Phone number of the contact person.'),
        mobile: z.string().optional().describe('Mobile number of the contact person.'),
        designation: z.string().optional().describe('Job title of the contact person.'),
        department: z.string().optional().describe('Department the contact person belongs to.'),
        skype: z.string().optional().describe('Skype ID of the contact person.'),
        fax: z.string().optional().describe('Fax number of the contact person.'),
        is_primary_contact: z.boolean().optional().describe('Whether this is the primary contact person for the contact.'),
        is_added_in_portal: z.boolean().optional().describe('Whether the contact person was added to the customer portal.'),
        can_invite: z.boolean().optional().describe('Whether the contact person can be invited to the customer portal.'),
        photo_url: z.string().optional().describe('URL of the contact person profile photo.')
    })
    .passthrough();

const ContactSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact.'),
        contact_name: z.string().optional().describe('Display name of the contact.'),
        company_name: z.string().optional().describe('Company name of the contact.'),
        contact_type: z.string().optional().describe('Type of contact, such as customer or vendor.'),
        customer_sub_type: z.string().optional().describe('Sub-type of the customer, such as business or individual.'),
        status: z.string().optional().describe('Status of the contact, such as active or inactive.'),
        first_name: z.string().optional().describe('First name of the contact.'),
        last_name: z.string().optional().describe('Last name of the contact.'),
        email: z.string().optional().describe('Email address of the contact.'),
        phone: z.string().optional().describe('Phone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        website: z.string().optional().describe('Website of the contact.'),
        designation: z.string().optional().describe('Job title of the primary contact.'),
        department: z.string().optional().describe('Department the primary contact belongs to.'),
        language_code: z.string().optional().describe('Language code configured for the contact.'),
        payment_terms: z.number().optional().describe('Number of days within which payment is due.'),
        payment_terms_id: z.string().optional().describe('Identifier of the payment terms configured for the contact.'),
        payment_terms_label: z.string().optional().describe('Human-readable payment terms label, such as "Due on Receipt".'),
        currency_id: z.string().optional().describe('Identifier of the currency configured for the contact.'),
        currency_code: z.string().optional().describe('ISO currency code, such as USD.'),
        currency_symbol: z.string().optional().describe('Currency symbol, such as $.'),
        has_transaction: z.boolean().optional().describe('Whether any sales order, invoice, or credit note references this contact.'),
        outstanding_receivable_amount: z.number().optional().describe('Amount the customer currently owes.'),
        outstanding_payable_amount: z.number().optional().describe('Amount currently owed to the vendor.'),
        unused_credits_receivable_amount: z.number().optional().describe('Unused customer credits available.'),
        unused_credits_payable_amount: z.number().optional().describe('Unused vendor credits available.'),
        opening_balance_amount: z.number().optional().describe('Opening balance amount for the contact.'),
        portal_status: z.string().optional().describe('Customer portal status, such as enabled or disabled.'),
        owner_id: z.string().optional().describe('Identifier of the user who owns the contact.'),
        owner_name: z.string().optional().describe('Name of the user who owns the contact.'),
        source: z.string().optional().describe('Source that created the contact, such as api.'),
        is_linked_with_zohocrm: z.boolean().optional().describe('Whether the contact is linked to a Zoho CRM record.'),
        notes: z.string().optional().describe('Free-form notes stored on the contact.'),
        pricebook_id: z.string().optional().describe('Identifier of the price book associated with the contact.'),
        pricebook_name: z.string().optional().describe('Name of the price book associated with the contact.'),
        created_time: z.string().optional().describe('Timestamp when the contact was created, in the organization timezone.'),
        last_modified_time: z.string().optional().describe('Timestamp when the contact was last modified, in the organization timezone.'),
        billing_address: AddressSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressSchema.optional().describe('Shipping address of the contact.'),
        contact_persons: z.array(ContactPersonSchema).optional().describe('Contact persons associated with the contact.'),
        tags: z.array(TagSchema).optional().describe('Tags applied to the contact.')
    })
    .passthrough()
    .describe('Full Zoho Inventory contact record, including addresses and contact persons.');

const GetContactResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    contact: z.unknown().optional()
});

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to retrieve. Example: "982000000567001"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving a single contact from Zoho Inventory.');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact from Zoho Inventory and does not modify any provider state.
 * @pitfalls: A deleted or inaccessible contact surfaces as a not_found error rather than an empty object; absent text fields are returned as empty strings instead of null, and has_transaction flips to true only once a sales order, invoice, or credit note references the contact.
 */
const action = createAction({
    description: 'Get full details for one contact by ID, including addresses and contact persons.',
    version: '1.0.0',
    input: InputSchema,
    output: ContactSchema,
    scopes: ['ZohoInventory.contacts.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof ContactSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        let responseData: unknown;

        // @allowTryCatch: Zoho answers a deleted or inaccessible contact with HTTP 404 (code 1002); translate that expected failure into a typed ActionError instead of a raw transport error.
        try {
            const response = await nango.get({
                // https://www.zoho.com/inventory/api/v1/contacts/#retrieve-a-contact
                endpoint: `/inventory/v1/contacts/${encodeURIComponent(input.contact_id)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            });

            responseData = response.data;
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Contact ${input.contact_id} was not found or is not accessible.`,
                    contact_id: input.contact_id
                });
            }

            throw error;
        }

        const envelope = GetContactResponseSchema.safeParse(responseData);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when retrieving contact.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message,
                code: envelope.data.code
            });
        }

        const contact = ContactSchema.safeParse(envelope.data.contact);
        if (!contact.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected contact payload from Zoho Inventory API.',
                details: contact.error.message
            });
        }

        return contact.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
