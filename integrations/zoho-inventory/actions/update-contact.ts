import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const AddressInputSchema = z.object({
    attention: z.string().optional().describe('Person the address is addressed to. Example: "Accounts Payable"'),
    address: z.string().optional().describe('Street address line 1.'),
    street2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    zip: z.string().optional().describe('ZIP or postal code.'),
    country: z.string().optional().describe('Country. Example: "U.S.A"')
});

const CustomFieldSchema = z.object({
    value: z.string().describe('Value of the custom field.'),
    index: z.number().int().describe('Index of the custom field, from 1 to 10.'),
    label: z.string().optional().describe('Label of the custom field.')
});

const OpeningBalanceSchema = z.object({
    location_id: z.string().describe('ID of the location the opening balance applies to.'),
    exchange_rate: z.number().describe('Exchange rate used for the opening balance.'),
    opening_balance_amount: z.number().describe('Opening balance amount for the contact.')
});

const CommunicationPreferenceSchema = z.object({
    is_sms_enabled: z.boolean().optional().describe('Whether SMS communication is enabled for this contact person.'),
    is_whatsapp_enabled: z.boolean().optional().describe('Whether WhatsApp communication is enabled for this contact person.')
});

const ContactPersonSchema = z.object({
    salutation: z.string().optional().describe('Salutation. Example: "Mr"'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    is_primary_contact: z.boolean().optional().describe('Set to true to mark this contact person as the primary contact.'),
    communication_preference: CommunicationPreferenceSchema.optional().describe('Preferred modes of communication for this contact person.')
});

const DefaultTemplatesSchema = z.object({
    invoice_template_id: z.string().optional().describe('ID of the invoice template.'),
    invoice_template_name: z.string().optional().describe('Name of the invoice template.'),
    estimate_template_id: z.string().optional().describe('ID of the estimate template.'),
    estimate_template_name: z.string().optional().describe('Name of the estimate template.'),
    creditnote_template_id: z.string().optional().describe('ID of the credit note template.'),
    creditnote_template_name: z.string().optional().describe('Name of the credit note template.'),
    invoice_email_template_id: z.string().optional().describe('ID of the invoice email template.'),
    invoice_email_template_name: z.string().optional().describe('Name of the invoice email template.'),
    estimate_email_template_id: z.string().optional().describe('ID of the estimate email template.'),
    estimate_email_template_name: z.string().optional().describe('Name of the estimate email template.'),
    creditnote_email_template_id: z.string().optional().describe('ID of the credit note email template.'),
    creditnote_email_template_name: z.string().optional().describe('Name of the credit note email template.')
});

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the contact to update. Example: "260815000000097001"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        contact_name: z.string().optional().describe('Name of the contact (organisation or individual).'),
        company_name: z.string().optional().describe('Company name associated with the contact.'),
        contact_type: z.enum(['customer', 'vendor']).optional().describe('Type of the contact.'),
        payment_terms: z.number().int().optional().describe('Net payment term in days.'),
        currency_id: z.string().optional().describe('ID of the currency used by the contact.'),
        website: z.string().optional().describe('Website of the contact.'),
        language_code: z.string().optional().describe('Language code of the contact. Allowed values: de, en, es, fr, it, ja, nl, pt, sv, zh.'),
        notes: z.string().optional().describe('Free-form notes about the contact.'),
        facebook: z.string().optional().describe('Facebook profile of the contact.'),
        twitter: z.string().optional().describe('Twitter/X handle of the contact.'),
        is_taxable: z.boolean().optional().describe('Whether the contact is taxable.'),
        tax_id: z.string().optional().describe('ID of the tax or tax group to collect from the contact.'),
        tax_authority_id: z.string().optional().describe('ID of the tax authority.'),
        tax_authority_name: z.string().optional().describe('Name of the tax authority.'),
        tax_exemption_id: z.string().optional().describe('ID of the tax exemption.'),
        tax_exemption_code: z.string().optional().describe('Tax exemption code.'),
        vat_reg_no: z.string().optional().describe('VAT registration number (UK / Avalara).'),
        vat_treatment: z.string().optional().describe('VAT treatment (UK). Allowed values: uk, eu_vat_registered, overseas.'),
        tax_reg_no: z.string().optional().describe('Tax registration number (Mexico).'),
        tax_treatment: z.string().optional().describe('Tax treatment of the contact (Mexico).'),
        tax_regime: z.string().optional().describe('Tax regime of the contact (Mexico).'),
        legal_name: z.string().optional().describe('Legal name of the contact (Mexico).'),
        is_tds_registered: z.boolean().optional().describe('Whether the contact is registered for tax (Mexico).'),
        country_code: z.string().optional().describe('Two-letter country code of the contact (UK / Avalara).'),
        avatax_exempt_no: z.string().optional().describe('Avalara exemption certificate number.'),
        avatax_use_code: z.string().optional().describe('Avalara use code grouping the contact for exemption purposes.'),
        place_of_contact: z.string().optional().describe('Place of contact (India).'),
        gst_no: z.string().optional().describe('15-digit GST identification number (India).'),
        gst_treatment: z.string().optional().describe('GST treatment (India). Allowed values: business_gst, business_none, overseas, consumer.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields to set on the contact.'),
        opening_balances: z.array(OpeningBalanceSchema).optional().describe('Opening balances per location.'),
        billing_address: AddressInputSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressInputSchema.optional().describe('Shipping address of the contact.'),
        contact_persons: z.array(ContactPersonSchema).optional().describe('Contact persons of the contact. Removing a person from this list deletes it.'),
        default_templates: DefaultTemplatesSchema.optional().describe('Default document templates for the contact.')
    })
    .describe('Fields to update on an existing Zoho Inventory contact; only the supplied fields are changed.');

const ProviderAddressSchema = z.object({
    attention: z.string().nullish(),
    address: z.string().nullish(),
    street2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    zip: z.string().nullish(),
    country: z.string().nullish()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().nullish(),
    company_name: z.string().nullish(),
    contact_type: z.string().nullish(),
    status: z.string().nullish(),
    website: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    payment_terms: z.number().nullish(),
    payment_terms_label: z.string().nullish(),
    currency_code: z.string().nullish(),
    notes: z.string().nullish(),
    has_transaction: z.boolean().nullish(),
    billing_address: ProviderAddressSchema.nullish(),
    shipping_address: ProviderAddressSchema.nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish()
});

const UpdateContactResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    contact: ProviderContactSchema.nullish()
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the updated contact.'),
        contact_name: z.string().optional().describe('Name of the contact.'),
        company_name: z.string().optional().describe('Company name associated with the contact.'),
        contact_type: z.string().optional().describe('Type of the contact, e.g. "customer" or "vendor".'),
        status: z.string().optional().describe('Status of the contact, e.g. "active" or "inactive".'),
        website: z.string().optional().describe('Website of the contact.'),
        first_name: z.string().optional().describe('First name of the contact.'),
        last_name: z.string().optional().describe('Last name of the contact.'),
        email: z.string().optional().describe('Email address of the contact.'),
        phone: z.string().optional().describe('Phone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        payment_terms: z.number().optional().describe('Net payment term in days.'),
        payment_terms_label: z.string().optional().describe('Human-readable payment term label. Example: "Net 15"'),
        currency_code: z.string().optional().describe('Currency code of the contact. Example: "USD"'),
        notes: z.string().optional().describe('Notes about the contact.'),
        has_transaction: z.boolean().optional().describe('Whether the contact has any associated transactions.'),
        billing_address: AddressInputSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressInputSchema.optional().describe('Shipping address of the contact.'),
        created_time: z.string().optional().describe('Creation timestamp in the provider format. Example: "2026-06-09T09:45:19-0400"'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in the provider format. Example: "2026-06-09T13:15:33-0400"')
    })
    .describe('The updated Zoho Inventory contact.');

function mapAddress(address: z.infer<typeof ProviderAddressSchema>): z.infer<typeof AddressInputSchema> {
    return {
        ...(address.attention != null && { attention: address.attention }),
        ...(address.address != null && { address: address.address }),
        ...(address.street2 != null && { street2: address.street2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.state != null && { state: address.state }),
        ...(address.zip != null && { zip: address.zip }),
        ...(address.country != null && { country: address.country })
    };
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list to resolve the organization_id when it is not supplied, then updates the existing contact.
 * @pitfalls: Partial update: omitted fields are left unchanged, so send only what you want to change, and at least one field must be supplied or the action fails; the documented `contact_name` requirement is not enforced; text fields with no value come back as empty strings rather than null.
 */
const action = createAction({
    description: 'Partially update an existing contact in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.UPDATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const data: Record<string, unknown> = {};

        if (input.contact_name !== undefined) {
            data['contact_name'] = input.contact_name;
        }
        if (input.company_name !== undefined) {
            data['company_name'] = input.company_name;
        }
        if (input.contact_type !== undefined) {
            data['contact_type'] = input.contact_type;
        }
        if (input.payment_terms !== undefined) {
            data['payment_terms'] = input.payment_terms;
        }
        if (input.currency_id !== undefined) {
            data['currency_id'] = input.currency_id;
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
        if (input.facebook !== undefined) {
            data['facebook'] = input.facebook;
        }
        if (input.twitter !== undefined) {
            data['twitter'] = input.twitter;
        }
        if (input.is_taxable !== undefined) {
            data['is_taxable'] = input.is_taxable;
        }
        if (input.tax_id !== undefined) {
            data['tax_id'] = input.tax_id;
        }
        if (input.tax_authority_id !== undefined) {
            data['tax_authority_id'] = input.tax_authority_id;
        }
        if (input.tax_authority_name !== undefined) {
            data['tax_authority_name'] = input.tax_authority_name;
        }
        if (input.tax_exemption_id !== undefined) {
            data['tax_exemption_id'] = input.tax_exemption_id;
        }
        if (input.tax_exemption_code !== undefined) {
            data['tax_exemption_code'] = input.tax_exemption_code;
        }
        if (input.vat_reg_no !== undefined) {
            data['vat_reg_no'] = input.vat_reg_no;
        }
        if (input.vat_treatment !== undefined) {
            data['vat_treatment'] = input.vat_treatment;
        }
        if (input.tax_reg_no !== undefined) {
            data['tax_reg_no'] = input.tax_reg_no;
        }
        if (input.tax_treatment !== undefined) {
            data['tax_treatment'] = input.tax_treatment;
        }
        if (input.tax_regime !== undefined) {
            data['tax_regime'] = input.tax_regime;
        }
        if (input.legal_name !== undefined) {
            data['legal_name'] = input.legal_name;
        }
        if (input.is_tds_registered !== undefined) {
            data['is_tds_registered'] = input.is_tds_registered;
        }
        if (input.country_code !== undefined) {
            data['country_code'] = input.country_code;
        }
        if (input.avatax_exempt_no !== undefined) {
            data['avatax_exempt_no'] = input.avatax_exempt_no;
        }
        if (input.avatax_use_code !== undefined) {
            data['avatax_use_code'] = input.avatax_use_code;
        }
        if (input.place_of_contact !== undefined) {
            data['place_of_contact'] = input.place_of_contact;
        }
        if (input.gst_no !== undefined) {
            data['gst_no'] = input.gst_no;
        }
        if (input.gst_treatment !== undefined) {
            data['gst_treatment'] = input.gst_treatment;
        }
        if (input.custom_fields !== undefined) {
            data['custom_fields'] = input.custom_fields;
        }
        if (input.opening_balances !== undefined) {
            data['opening_balances'] = input.opening_balances;
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
        if (input.default_templates !== undefined) {
            data['default_templates'] = input.default_templates;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'Provide at least one field to update.',
                contact_id: input.contact_id
            });
        }

        // https://www.zoho.com/inventory/api/v1/contacts/#update-a-contact
        const response = await nango.put({
            endpoint: `/inventory/v1/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        const result = UpdateContactResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when updating contact.',
                details: result.error.message
            });
        }

        const parsed = result.data;

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message ?? 'Zoho Inventory returned an error while updating the contact.',
                code: parsed.code
            });
        }

        const contact = parsed.contact;

        if (!contact) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'The contact could not be updated.',
                contact_id: input.contact_id
            });
        }

        return {
            contact_id: contact.contact_id,
            ...(contact.contact_name != null && { contact_name: contact.contact_name }),
            ...(contact.company_name != null && { company_name: contact.company_name }),
            ...(contact.contact_type != null && { contact_type: contact.contact_type }),
            ...(contact.status != null && { status: contact.status }),
            ...(contact.website != null && { website: contact.website }),
            ...(contact.first_name != null && { first_name: contact.first_name }),
            ...(contact.last_name != null && { last_name: contact.last_name }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.mobile != null && { mobile: contact.mobile }),
            ...(contact.payment_terms != null && { payment_terms: contact.payment_terms }),
            ...(contact.payment_terms_label != null && { payment_terms_label: contact.payment_terms_label }),
            ...(contact.currency_code != null && { currency_code: contact.currency_code }),
            ...(contact.notes != null && { notes: contact.notes }),
            ...(contact.has_transaction != null && { has_transaction: contact.has_transaction }),
            ...(contact.billing_address != null && { billing_address: mapAddress(contact.billing_address) }),
            ...(contact.shipping_address != null && { shipping_address: mapAddress(contact.shipping_address) }),
            ...(contact.created_time != null && { created_time: contact.created_time }),
            ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
