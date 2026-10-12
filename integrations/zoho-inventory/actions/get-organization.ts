import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    street_address1: z.string().optional().describe('First line of the organization street address. Example: "123 Main St"'),
    street_address2: z.string().optional().describe('Second line of the organization street address.'),
    city: z.string().optional().describe('City of the organization address. Example: "Wilmington"'),
    state: z.string().optional().describe('State or province name of the organization address. Example: "Delaware"'),
    state_code: z.string().optional().describe('State or province code of the organization address. Example: "DE"'),
    country: z.string().optional().describe('Country name of the organization address. Example: "U.S.A"'),
    country_code: z.string().optional().describe('Two-letter country code of the organization address. Example: "US"'),
    zip: z.string().optional().describe('Postal or ZIP code of the organization address.'),
    latitude: z.string().optional().describe('Latitude of the organization address, as a string.'),
    longitude: z.string().optional().describe('Longitude of the organization address, as a string.'),
    attention: z.string().optional().describe('Attention line for the organization address.')
});

const TaxSettingsSchema = z.object({
    is_tax_registered: z.boolean().optional().describe('Whether the organization is registered for tax.'),
    tax_reg_no: z.string().optional().describe('Tax registration number, when the organization is registered for tax.')
});

const CustomFieldSchema = z.object({
    index: z.number().optional().describe('1-based position of the custom field. Example: 1'),
    label: z.string().optional().describe('Display label configured for the custom field.'),
    value: z.string().optional().describe('Current value stored in the custom field.')
});

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Inventory organization ID to retrieve. Example: "927270289"')
    })
    .describe('Identifies the Zoho Inventory organization to retrieve.');

const OutputSchema = z
    .object({
        organization_id: z.string().optional().describe('Unique identifier of the organization. Example: "927270289"'),
        name: z.string().optional().describe('Organization name. Example: "Nango Dev"'),
        first_name: z.string().optional().describe('First name of the organization contact.'),
        last_name: z.string().optional().describe('Last name of the organization contact.'),
        logo_url: z.string().optional().describe('URL of the organization logo, empty when not set.'),
        store_logo_url: z.string().optional().describe('URL of the organization store logo, empty when not set.'),
        is_default_org: z.boolean().optional().describe('Whether this is the default organization for the user.'),
        user_role: z.string().optional().describe('Role of the current user in this organization. Example: "Admin"'),
        role_id: z.string().optional().describe('Identifier of the current user role in this organization.'),
        account_created_date: z.string().optional().describe('Date the account was created. Example: "2026-06-09"'),
        time_zone: z.string().optional().describe('Organization time zone. Example: "America/New_York"'),
        language_code: z.string().optional().describe('Default language code of the organization. Example: "en"'),
        customer_languages: z.array(z.string()).optional().describe('Language codes available for customer-facing documents. Example: ["en"]'),
        date_format: z.string().optional().describe('Date format used across the organization. Example: "dd MMM yyyy"'),
        field_separator: z.string().optional().describe('Separator used between custom field labels and values.'),
        fiscal_year_start_month: z.string().optional().describe('Month the fiscal year begins, as a lowercase month name. Example: "january"'),
        fiscal_year_start_date: z.number().optional().describe('Day of the month the fiscal year begins. Example: 1'),
        primary_domain_name: z.string().optional().describe('Primary domain name of the organization. Example: "nango.dev"'),
        is_public_domain: z.boolean().optional().describe('Whether the organization uses a public domain.'),
        can_show_authentication_warning: z.boolean().optional().describe('Whether an authentication warning may be shown.'),
        contact_name: z.string().optional().describe('Name of the primary organization contact.'),
        industry_type: z.string().optional().describe('Industry the organization belongs to, empty when not set.'),
        industry_size: z.string().optional().describe('Size of the organization industry, empty when not set.'),
        previous_invoicing_option: z.string().optional().describe('Previously selected invoicing option.'),
        previous_product_option: z.string().optional().describe('Previously selected product option.'),
        company_id_label: z.string().optional().describe('Label displayed for the company identifier field. Example: "Company ID :"'),
        custom_field_type: z.number().optional().describe('Numeric indicator of the custom field layout type.'),
        is_trial_period_extended: z.boolean().optional().describe('Whether the trial period was extended.'),
        is_quick_setup_completed: z.boolean().optional().describe('Whether the organization finished quick setup. Example: true'),
        is_sez: z.boolean().optional().describe('Whether the organization is in a Special Economic Zone.'),
        is_designated_zone: z.boolean().optional().describe('Whether the organization is in a designated zone.'),
        is_free_zone: z.boolean().optional().describe('Whether the organization is in a free zone.'),
        store_url: z.string().optional().describe('URL of the organization online store, empty when not set.'),
        company_id_value: z.string().optional().describe('Value of the company identifier, empty when not set.'),
        label_for_company_id: z.string().optional().describe('Label used for the company identifier. Example: "Company ID"'),
        tax_id_label: z.string().optional().describe('Label used for the tax identifier field. Example: "Tax ID :"'),
        tax_id_value: z.string().optional().describe('Value of the tax identifier, empty when not set.'),
        currency_id: z.string().optional().describe('Identifier of the organization base currency. Example: "260815000000000097"'),
        currency_code: z.string().optional().describe('ISO code of the organization base currency. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Symbol of the organization base currency. Example: "$"'),
        currency_format: z.string().optional().describe('Formatting pattern for currency amounts. Example: "###,##0.00"'),
        price_precision: z.number().optional().describe('Number of decimal places used for prices. Example: 2'),
        status: z.string().optional().describe('Status indicator of the organization. Example: "1"'),
        address: AddressSchema.optional().describe('Registered address of the organization.'),
        tax_settings: TaxSettingsSchema.optional().describe('Tax registration settings of the organization.'),
        is_registered_for_gst: z.boolean().optional().describe('Whether the organization is registered for GST.'),
        org_address: z.string().optional().describe('Formatted organization address string, empty when not set.'),
        remit_to_address: z.string().optional().describe('Address payments should be remitted to, empty when not set.'),
        phone: z.string().optional().describe('Primary phone number of the organization.'),
        fax: z.string().optional().describe('Fax number of the organization.'),
        website: z.string().optional().describe('Website of the organization.'),
        version: z.string().optional().describe('Edition or region version of the organization. Example: "us"'),
        weight_unit: z.string().optional().describe('Default unit used for weights. Example: "lb"'),
        dimension_unit: z.string().optional().describe('Default unit used for dimensions. Example: "in"'),
        is_old_email_flow: z.boolean().optional().describe('Whether the organization uses the legacy email flow.'),
        business_type: z.string().optional().describe('Business type of the organization, empty when not set.'),
        email: z.string().optional().describe('Primary email address of the organization. Example: "api@nango.dev"'),
        unverified_emails_count: z.number().optional().describe('Number of unverified email addresses. Example: 0'),
        tax_basis: z.string().optional().describe('Tax basis used by the organization. Example: "accrual"'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Configured custom fields and their current values.'),
        custom_field_hash: z.record(z.string(), z.string()).optional().describe('Custom field values keyed by field hash, e.g. "cf_1".'),
        is_org_active: z.boolean().optional().describe('Whether the organization is active.'),
        is_new_customer_custom_fields: z.boolean().optional().describe('Whether the new customer custom field layout is enabled.'),
        is_portal_enabled: z.boolean().optional().describe('Whether the customer portal is enabled.'),
        org_joined_app_list: z
            .array(z.string())
            .optional()
            .describe('Finance-suite applications activated for this organization. Example: ["books", "inventory"]'),
        company_identification_labels_list: z.array(z.string()).optional().describe('Additional company identification labels configured.'),
        portal_name: z.string().optional().describe('Customer portal name of the organization. Example: "nangodev"'),
        business_start_date: z.string().optional().describe('Date the business started. Example: "2026-06-09"'),
        inventory_start_date: z.string().optional().describe('Date the organization started using Zoho Inventory. Example: "2026-06-09"'),
        is_project_enabled: z.boolean().optional().describe('Whether projects are enabled for the organization.'),
        is_retainerinvoice_enabled: z.boolean().optional().describe('Whether retainer invoices are enabled for the organization.'),
        mode: z.string().optional().describe('Operating mode of the organization. Example: "live"'),
        payments_url: z.string().optional().describe('URL used for collecting payments, empty when not set.')
    })
    .describe('Full details of a Zoho Inventory organization, including address, fiscal settings, currency, and custom fields.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    organization: z.unknown().optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single organization's full details from Zoho Inventory and performs no provider mutation.
 * @pitfalls: Unconfigured organization settings come back as empty strings or empty objects rather than being omitted, so optional fields are typically present but empty.
 */
const action = createAction({
    description: 'Get full details (address, fiscal settings, currency, custom fields) for one organization by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/organizations/
            endpoint: `/inventory/v1/organizations/${encodeURIComponent(input.organization_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const envelope = ProviderResponseSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when retrieving organization.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory returned an error while retrieving the organization.',
                code: envelope.data.code
            });
        }

        const organization = OutputSchema.safeParse(envelope.data.organization);
        if (!organization.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected organization payload from Zoho Inventory API.',
                details: organization.error.message
            });
        }

        return organization.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
