import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    invoice_id: z.string().describe('Unique identifier of the invoice. Example: "260815000000103001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const LineItemSchema = z
    .object({
        line_item_id: z.union([z.string(), z.number()]).optional(),
        item_id: z.union([z.string(), z.number()]).optional(),
        project_id: z.union([z.string(), z.number()]).optional(),
        project_name: z.string().optional(),
        time_entry_ids: z.array(z.unknown()).optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        item_type: z.string().optional(),
        product_type: z.string().optional(),
        expense_id: z.union([z.string(), z.number()]).optional(),
        expense_receipt_name: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        item_order: z.number().optional(),
        bcy_rate: z.number().optional(),
        rate: z.number().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        discount_amount: z.number().optional(),
        discount: z.number().optional(),
        tags: z.array(z.object({}).passthrough()).optional(),
        tax_id: z.union([z.string(), z.number()]).optional(),
        tax_name: z.string().optional(),
        tax_type: z.string().optional(),
        tax_percentage: z.number().optional(),
        tax_treatment_code: z.string().optional(),
        item_total: z.number().optional(),
        header_name: z.string().optional(),
        header_id: z.union([z.string(), z.number()]).optional()
    })
    .passthrough();

const AddressSchema = z
    .object({
        address: z.string().optional(),
        street2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.union([z.string(), z.number()]).optional(),
        country: z.string().optional(),
        fax: z.string().optional()
    })
    .passthrough();

const TaxSchema = z
    .object({
        tax_name: z.string().optional(),
        tax_amount: z.number().optional()
    })
    .passthrough();

const PaymentGatewaySchema = z
    .object({
        configured: z.boolean().optional(),
        additional_field1: z.string().optional(),
        gateway_name: z.string().optional()
    })
    .passthrough();

const PaymentOptionsSchema = z
    .object({
        payment_gateways: z.array(PaymentGatewaySchema).optional()
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.union([z.string(), z.number()]).optional(),
        contact_person_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        contact_person_email: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        communication_preference: z
            .object({
                is_email_enabled: z.boolean().optional(),
                is_sms_enabled: z.boolean().optional(),
                is_whatsapp_enabled: z.boolean().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const TagSchema = z
    .object({
        tag_id: z.union([z.string(), z.number()]).optional(),
        tag_name: z.string().optional(),
        tag_option_id: z.union([z.string(), z.number()]).optional(),
        tag_option_name: z.string().optional(),
        is_tag_mandatory: z.boolean().optional()
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        customfield_id: z.union([z.string(), z.number()]).optional(),
        value: z.string().optional()
    })
    .passthrough();

const ProviderInvoiceSchema = z
    .object({
        invoice_id: z.union([z.string(), z.number()]).describe('Unique identifier of the invoice'),
        ach_payment_initiated: z.boolean().optional(),
        invoice_number: z.string().optional(),
        is_pre_gst: z.boolean().optional(),
        place_of_supply: z.string().optional(),
        gst_no: z.string().optional(),
        gst_treatment: z.string().optional(),
        cfdi_usage: z.string().optional(),
        vat_treatment: z.string().optional(),
        tax_treatment: z.string().optional(),
        is_reverse_charge_applied: z.boolean().optional(),
        vat_reg_no: z.string().optional(),
        date: z.string().optional(),
        status: z.string().optional(),
        payment_terms: z.number().optional(),
        payment_terms_label: z.string().optional(),
        due_date: z.string().optional(),
        payment_expected_date: z.string().optional(),
        last_payment_date: z.string().optional(),
        reference_number: z.string().optional(),
        customer_id: z.union([z.string(), z.number()]).optional(),
        customer_name: z.string().optional(),
        contact_persons_associated: z.array(ContactPersonSchema).optional(),
        currency_id: z.union([z.string(), z.number()]).optional(),
        currency_code: z.string().optional(),
        exchange_rate: z.number().optional(),
        discount: z.number().optional(),
        is_discount_before_tax: z.boolean().optional(),
        discount_type: z.string().optional(),
        is_inclusive_tax: z.boolean().optional(),
        recurring_invoice_id: z.string().optional(),
        is_viewed_by_client: z.boolean().optional(),
        has_attachment: z.boolean().optional(),
        client_viewed_time: z.string().optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        tags: z.array(TagSchema).optional(),
        line_items: z.array(LineItemSchema).optional(),
        shipping_charge: z.number().optional(),
        adjustment: z.number().optional(),
        adjustment_description: z.string().optional(),
        sub_total: z.number().optional(),
        tax_total: z.number().optional(),
        total: z.number().optional(),
        taxes: z.array(TaxSchema).optional(),
        payment_reminder_enabled: z.boolean().optional(),
        payment_made: z.number().optional(),
        credits_applied: z.number().optional(),
        tax_amount_withheld: z.number().optional(),
        balance: z.number().optional(),
        write_off_amount: z.number().optional(),
        allow_partial_payments: z.boolean().optional(),
        price_precision: z.number().optional(),
        payment_options: PaymentOptionsSchema.optional(),
        is_emailed: z.boolean().optional(),
        reminders_sent: z.number().optional(),
        last_reminder_sent_date: z.string().optional(),
        billing_address: AddressSchema.optional(),
        shipping_address: AddressSchema.optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        custom_fields: z.array(CustomFieldSchema).optional(),
        template_id: z.union([z.string(), z.number()]).optional(),
        template_name: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        attachment_name: z.string().optional(),
        can_send_in_mail: z.boolean().optional(),
        salesperson_id: z.string().optional(),
        salesperson_name: z.string().optional(),
        invoice_url: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderInvoiceSchema;

const action = createAction({
    description: 'Retrieve a single invoice from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/invoices/#get-an-invoice
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const responseBody = z
            .object({
                code: z.number(),
                message: z.string(),
                invoice: z.unknown()
            })
            .parse(response.data);

        if (responseBody.code !== 0 || !responseBody.invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                invoice_id: input.invoice_id
            });
        }

        const providerInvoice = ProviderInvoiceSchema.parse(responseBody.invoice);

        return providerInvoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
