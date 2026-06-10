import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    contact_id: z.string().describe('Contact ID. Example: "260815000000097001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const AddressSchema = z
    .object({
        attention: z.string().optional(),
        address: z.string().optional(),
        street2: z.string().optional(),
        state_code: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.union([z.string(), z.number()]).optional(),
        country: z.string().optional(),
        fax: z.string().optional(),
        phone: z.string().optional()
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.union([z.string(), z.number()]).optional(),
        salutation: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        skype: z.string().optional(),
        is_primary_contact: z.boolean().optional(),
        enable_portal: z.boolean().optional(),
        communication_preference: z
            .object({
                is_sms_enabled: z.boolean().optional(),
                is_whatsapp_enabled: z.boolean().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ContactSchema = z
    .object({
        contact_id: z.union([z.string(), z.number()]),
        contact_name: z.string().optional(),
        company_name: z.string().optional(),
        contact_type: z.string().optional(),
        status: z.string().optional(),
        customer_sub_type: z.string().optional(),
        credit_limit: z.number().optional(),
        is_portal_enabled: z.boolean().optional(),
        language_code: z.string().optional(),
        is_taxable: z.boolean().optional(),
        tax_id: z.union([z.string(), z.number()]).optional(),
        tax_name: z.string().optional(),
        tax_percentage: z.number().optional(),
        tax_authority_id: z.union([z.string(), z.number()]).optional(),
        tax_exemption_id: z.union([z.string(), z.number()]).optional(),
        tax_authority_name: z.string().optional(),
        tax_exemption_code: z.string().optional(),
        place_of_contact: z.string().optional(),
        gst_no: z.string().optional(),
        vat_treatment: z.string().optional(),
        tax_treatment: z.string().optional(),
        tax_exemption_certificate_number: z.string().optional(),
        tax_regime: z.string().optional(),
        legal_name: z.string().optional(),
        is_tds_registered: z.boolean().optional(),
        gst_treatment: z.string().optional(),
        is_linked_with_zohocrm: z.boolean().optional(),
        website: z.string().optional(),
        owner_id: z.union([z.string(), z.number()]).optional(),
        primary_contact_id: z.union([z.string(), z.number()]).optional(),
        pricebook_id: z.union([z.string(), z.number()]).optional(),
        contact_number: z.string().optional(),
        ignore_auto_number_generation: z.boolean().optional(),
        payment_terms: z.number().optional(),
        payment_terms_label: z.string().optional(),
        currency_id: z.union([z.string(), z.number()]).optional(),
        currency_code: z.string().optional(),
        currency_symbol: z.string().optional(),
        outstanding_receivable_amount: z.number().optional(),
        outstanding_receivable_amount_bcy: z.number().optional(),
        unused_credits_receivable_amount: z.number().optional(),
        unused_credits_receivable_amount_bcy: z.number().optional(),
        billing_address: AddressSchema.optional(),
        shipping_address: AddressSchema.optional(),
        facebook: z.string().optional(),
        twitter: z.string().optional(),
        payment_reminder_enabled: z.boolean().optional(),
        notes: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        contact_persons: z.array(ContactPersonSchema).optional(),
        custom_fields: z.array(z.object({}).passthrough()).optional(),
        default_templates: z.object({}).passthrough().optional(),
        opening_balances: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = ContactSchema;

const action = createAction({
    description: 'Retrieve a single contact from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.contacts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/contacts/#get-contact
            endpoint: `/books/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or invalid response',
                contact_id: input.contact_id
            });
        }

        const contact = 'contact' in response.data ? response.data['contact'] : undefined;

        if (!contact || typeof contact !== 'object' || contact === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contact_id: input.contact_id
            });
        }

        return ContactSchema.parse(contact);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
