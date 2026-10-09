import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldSchema = z.object({
    value: z.string().nullable().optional().describe('Value of the custom field.'),
    label: z.string().nullable().optional().describe('Label of the custom field.'),
    data_type: z.string().nullable().optional().describe('Data type of the custom field, for example "text" or "number".')
});

const AddressSchema = z.object({
    address: z.string().nullable().optional().describe('Street address.'),
    street2: z.string().nullable().optional().describe('Additional street address information.'),
    city: z.string().nullable().optional().describe('City.'),
    state: z.string().nullable().optional().describe('State or province.'),
    zip: z.string().nullable().optional().describe('ZIP or postal code.'),
    country: z.string().nullable().optional().describe('Country.'),
    fax: z.string().nullable().optional().describe('Fax number.')
});

const LineItemSchema = z.object({
    line_item_id: z.string().nullable().optional().describe('Unique ID of the line item.'),
    item_id: z.string().nullable().optional().describe('ID of the catalog item the line item is linked to, if any.'),
    name: z.string().nullable().optional().describe('Name or short description of the line item.'),
    description: z.string().nullable().optional().describe('Longer description of the line item.'),
    quantity: z.number().nullable().optional().describe('Quantity billed.'),
    rate: z.number().nullable().optional().describe('Unit rate of the line item.'),
    unit: z.string().nullable().optional().describe('Unit of measure, for example "qty" or "hrs".'),
    item_total: z.number().nullable().optional().describe('Total amount for the line item (rate multiplied by quantity).'),
    tax_id: z.string().nullable().optional().describe('ID of the tax applied to the line item.'),
    tax_name: z.string().nullable().optional().describe('Name of the tax applied to the line item.'),
    project_id: z.union([z.string(), z.number()]).nullable().optional().describe('ID of the project associated with the line item.'),
    project_name: z.string().nullable().optional().describe('Name of the project associated with the line item.')
});

const PaymentGatewaySchema = z.object({
    configured: z.boolean().nullable().optional().describe('Whether the payment gateway is configured for the recurring invoice.'),
    additional_field1: z.string().nullable().optional().describe('Additional gateway configuration value, for example the PayPal payment method.'),
    gateway_name: z.string().nullable().optional().describe('Name of the payment gateway, for example "paypal" or "stripe".')
});

const RecurringInvoiceSchema = z.object({
    recurring_invoice_id: z.string().describe('Unique ID of the recurring invoice profile.'),
    recurrence_name: z.string().nullable().optional().describe('Name of the recurring invoice profile.'),
    reference_number: z.string().nullable().optional().describe('Reference number for the recurring invoice.'),
    customer_id: z.string().nullable().optional().describe('ID of the customer the recurring invoice is raised to.'),
    customer_name: z.string().nullable().optional().describe('Name of the customer the recurring invoice is raised to.'),
    currency_id: z.string().nullable().optional().describe('ID of the currency used by the recurring invoice.'),
    currency_code: z.string().nullable().optional().describe('Currency code, for example "USD".'),
    start_date: z.string().nullable().optional().describe('Date the recurrence starts, in YYYY-MM-DD format.'),
    end_date: z.string().nullable().optional().describe('Date the recurrence ends, in YYYY-MM-DD format, if it has an end date.'),
    last_sent_date: z.string().nullable().optional().describe('Date the last generated invoice was sent, if any.'),
    next_invoice_date: z.string().nullable().optional().describe('Date the next invoice is scheduled to be generated.'),
    status: z.string().nullable().optional().describe('Status of the recurring invoice profile, for example "active", "stopped" or "expired".'),
    custom_fields: z.array(CustomFieldSchema).nullable().optional().describe('Custom fields configured on the recurring invoice.'),
    line_items: z.array(LineItemSchema).nullable().optional().describe('Line items that make up each generated invoice.'),
    billing_address: AddressSchema.nullable().optional().describe('Billing address of the customer.'),
    shipping_address: AddressSchema.nullable().optional().describe('Shipping address of the customer.'),
    payment_gateways: z.array(PaymentGatewaySchema).nullable().optional().describe('Payment gateways configured for the recurring invoice.'),
    payment_options: z.unknown().optional().describe('Payment options for the recurring invoice; the shape varies by account configuration.')
});

const PageContextSchema = z.object({
    page: z.number().nullable().optional().describe('Current page number (1-based).'),
    per_page: z.number().nullable().optional().describe('Number of records returned per page.'),
    has_more_page: z.boolean().nullable().optional().describe('Whether another page of results is available.'),
    report_name: z.string().nullable().optional().describe('Name of the report backing this list.'),
    sort_column: z.string().nullable().optional().describe('Column the results are sorted by.'),
    sort_order: z.string().nullable().optional().describe('Sort direction, for example "A" (ascending) or "D" (descending).')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    recurring_invoices: z.array(RecurringInvoiceSchema).nullable().optional(),
    page_context: PageContextSchema.nullable().optional()
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe('Zoho Invoice organization ID. Required: the API rejects requests without it and this connection cannot look it up.'),
        page: z.number().int().positive().optional().describe('Page of results to fetch (1-based). Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of records to fetch per page. Defaults to 200.')
    })
    .describe('Filters for listing recurring invoice profiles.');

const OutputSchema = z
    .object({
        recurring_invoices: z.array(RecurringInvoiceSchema).describe('Recurring invoice profiles returned for the requested page.'),
        page_context: PageContextSchema.optional().describe('Pagination metadata for the current page.')
    })
    .describe('A page of recurring invoice profiles together with its pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Only lists recurring invoice profiles from the provider; performs no provider mutations.
 * @pitfalls: organization_id is required - the provider rejects requests without it, and this connection's scopes do not allow looking it up.
 */
const action = createAction({
    description: 'List recurring invoice profiles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/recurring-invoices/
            endpoint: '/invoice/v3/recurringinvoices',
            params: {
                organization_id: input.organization_id,
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            recurring_invoices: parsed.recurring_invoices ?? [],
            ...(parsed.page_context != null && { page_context: parsed.page_context })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
