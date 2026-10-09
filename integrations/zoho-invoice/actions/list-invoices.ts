import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Required for every request; example: "123456789".'),
        customer_id: z.string().describe('Only return invoices billed to this customer (contact) ID. Example: "12345678900000001".').optional(),
        status: z
            .enum(['sent', 'draft', 'overdue', 'paid', 'void', 'unpaid', 'partially_paid', 'viewed'])
            .describe('Only return invoices in this status.')
            .optional(),
        date_start: z.string().describe('Only return invoices with an invoice date on or after this date (yyyy-mm-dd). Example: "2026-10-01".').optional(),
        date_end: z.string().describe('Only return invoices with an invoice date on or before this date (yyyy-mm-dd). Example: "2026-10-31".').optional(),
        due_date_start: z.string().describe('Only return invoices due on or after this date (yyyy-mm-dd). Example: "2026-10-01".').optional(),
        due_date_end: z.string().describe('Only return invoices due on or before this date (yyyy-mm-dd). Example: "2026-10-31".').optional(),
        last_modified_time: z
            .string()
            .describe('ISO-8601 timestamp; only return invoices modified at or after it. Use for incremental filtering. Example: "2026-10-01T00:00:00+0000".')
            .optional(),
        page: z.number().int().positive().describe('Page number to fetch, starting at 1. Defaults to 1.').optional(),
        per_page: z.number().int().positive().max(200).describe('Number of invoices per page, from 1 to 200. Defaults to 200.').optional()
    })
    .describe(
        'Filters for listing Zoho Invoice invoices, including organization, customer, status, date ranges, incremental last_modified_time, and pagination.'
    );

const AddressSchema = z.object({
    address: z.string().optional().describe('Street address.'),
    street2: z.string().optional().describe('Second line of the street address.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    zipcode: z.string().optional().describe('Postal or ZIP code.'),
    country: z.string().optional().describe('Country.'),
    phone: z.string().optional().describe('Phone number.'),
    fax: z.string().optional().describe('Fax number.'),
    attention: z.string().optional().describe('Attention line.')
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional().describe('Unique ID of the custom field.'),
    data_type: z.string().optional().describe('Data type of the custom field.'),
    index: z.number().optional().describe('Position of the custom field.'),
    label: z.string().optional().describe('Display label of the custom field.'),
    show_on_pdf: z.boolean().optional().describe('Whether the field is shown on the invoice PDF.'),
    show_in_all_pdf: z.boolean().optional().describe('Whether the field is shown on all invoice PDFs.'),
    value: z.unknown().optional().describe('Value stored in the custom field.')
});

const InvoiceSchema = z.object({
    invoice_id: z.string().describe('Unique ID of the invoice.'),
    invoice_number: z.string().optional().describe('Invoice number as shown to the customer.'),
    status: z.enum(['sent', 'draft', 'overdue', 'paid', 'void', 'unpaid', 'partially_paid', 'viewed']).optional().describe('Current status of the invoice.'),
    customer_id: z.string().optional().describe('ID of the customer the invoice is billed to.'),
    customer_name: z.string().optional().describe('Name of the customer the invoice is billed to.'),
    company_name: z.string().optional().describe('Company name associated with the customer.'),
    reference_number: z.string().optional().describe('Reference or purchase order number for the invoice.'),
    date: z.string().optional().describe('Invoice date (yyyy-mm-dd).'),
    due_date: z.string().optional().describe('Invoice due date (yyyy-mm-dd).'),
    due_days: z.string().optional().describe('Human-readable description of how far the due date is.'),
    issued_date: z.string().optional().describe('Date the invoice was issued (yyyy-mm-dd).'),
    email: z.string().optional().describe('Billing email on the invoice.'),
    project_name: z.string().optional().describe('Name of the project the invoice is linked to, if any.'),
    country: z.string().optional().describe('Country of the customer.'),
    phone: z.string().optional().describe('Phone number of the customer.'),
    created_by: z.string().optional().describe('Name of the user who created the invoice.'),
    total: z.number().optional().describe('Total invoice amount.'),
    balance: z.number().optional().describe('Outstanding unpaid amount on the invoice.'),
    payment_expected_date: z.string().optional().describe('Expected date of payment (yyyy-mm-dd).'),
    last_payment_date: z.string().optional().describe('Date of the most recent payment (yyyy-mm-dd).'),
    shipping_charge: z.number().optional().describe('Shipping charge applied to the invoice.'),
    adjustment: z.number().optional().describe('Adjustment applied to the invoice.'),
    write_off_amount: z.number().optional().describe('Amount written off for the invoice.'),
    unprocessed_payment_amount: z.number().optional().describe('Payment amount not yet applied to an invoice.'),
    exchange_rate: z.number().optional().describe('Exchange rate applied to the invoice currency.'),
    currency_id: z.string().optional().describe('ID of the invoice currency.'),
    currency_code: z.string().optional().describe('ISO code of the invoice currency (e.g. "USD").'),
    currency_symbol: z.string().optional().describe('Symbol of the invoice currency (e.g. "$").'),
    current_sub_status: z.string().optional().describe('Current sub-status of the invoice.'),
    current_sub_status_id: z.string().optional().describe('ID of the current sub-status of the invoice.'),
    template_id: z.string().optional().describe('ID of the PDF template associated with the invoice.'),
    template_type: z.string().optional().describe('Type of the PDF template associated with the invoice.'),
    invoice_url: z.string().optional().describe('Customer-facing secure link to view the invoice.'),
    invoice_source: z.string().optional().describe('Source the invoice was created from (e.g. "Api").'),
    sales_channel: z.string().optional().describe('Sales channel associated with the invoice.'),
    transaction_type: z.string().optional().describe('Transaction type of the invoice.'),
    is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the invoice.'),
    has_attachment: z.boolean().optional().describe('Whether the invoice has an attachment.'),
    client_viewed_time: z.string().optional().describe('Time the customer last viewed the invoice.'),
    is_emailed: z.boolean().optional().describe('Whether the invoice has been emailed.'),
    is_viewed_in_mail: z.boolean().optional().describe('Whether the invoice email was viewed.'),
    mail_first_viewed_time: z.string().optional().describe('Time the invoice email was first viewed.'),
    mail_last_viewed_time: z.string().optional().describe('Time the invoice email was last viewed.'),
    reminders_sent: z.number().optional().describe('Number of payment reminders sent for the invoice.'),
    last_reminder_sent_date: z.string().optional().describe('Date the most recent reminder was sent (yyyy-mm-dd).'),
    schedule_time: z.string().optional().describe('Scheduled delivery time of the invoice, if any.'),
    salesperson_id: z.string().optional().describe('ID of the salesperson linked to the invoice.'),
    salesperson_name: z.string().optional().describe('Name of the salesperson linked to the invoice.'),
    documents: z.string().optional().describe('Names of documents attached to the invoice.'),
    color_code: z.string().optional().describe('Color code configured for the invoice.'),
    ach_payment_initiated: z.boolean().optional().describe('Whether an ACH payment has been initiated.'),
    zcrm_potential_id: z.string().optional().describe('ID of the linked CRM deal, if any.'),
    zcrm_potential_name: z.string().optional().describe('Name of the linked CRM deal, if any.'),
    created_time: z.string().optional().describe('Time the invoice was created.'),
    updated_time: z.string().optional().describe('Time the invoice was last updated.'),
    last_modified_time: z.string().optional().describe('Time the invoice was last modified.'),
    billing_address: AddressSchema.optional().describe('Billing address of the customer.'),
    shipping_address: AddressSchema.optional().describe('Shipping address of the invoice.'),
    custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields configured on the invoice.'),
    custom_field_hash: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by field identifier.')
});

const PageContextSchema = z.object({
    page: z.number().describe('Current page number.'),
    per_page: z.number().describe('Number of records requested per page.'),
    has_more_page: z.boolean().describe('Whether another page of results is available.'),
    report_name: z.string().optional().describe('Name of the report backing the listing.'),
    applied_filter: z.string().optional().describe('Status filter applied to the listing.'),
    sort_column: z.string().optional().describe('Column the results are sorted by.'),
    sort_order: z.string().optional().describe('Sort direction: "A" for ascending, "D" for descending.')
});

const OutputSchema = z
    .object({
        invoices: z.array(InvoiceSchema).describe('Invoices matching the supplied filters.'),
        page_context: PageContextSchema.describe('Pagination metadata for the returned page; check has_more_page to fetch the next page.')
    })
    .describe('A page of Zoho Invoice invoices along with the pagination metadata needed to fetch further pages.');

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    invoices: z.array(InvoiceSchema),
    page_context: PageContextSchema
});

/**
 * @tags: [read]
 * @tagReason: Lists provider invoices without creating, updating, or deleting any provider data.
 * @pitfalls: organization_id is required (Zoho fails with error code 9017 without it), and it cannot be discovered with this connection's granted scopes; last_modified_time must be an ISO-8601 timestamp with a numeric UTC offset such as "2026-10-01T00:00:00+0000".
 */
const action = createAction({
    description: 'List invoices, with optional customer, status and date filters and incremental last_modified_time filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/invoices/#list-invoices
            endpoint: '/invoice/v3/invoices',
            params: {
                organization_id: input.organization_id,
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.date_start !== undefined && { date_start: input.date_start }),
                ...(input.date_end !== undefined && { date_end: input.date_end }),
                ...(input.due_date_start !== undefined && { due_date_start: input.due_date_start }),
                ...(input.due_date_end !== undefined && { due_date_end: input.due_date_end }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            invoices: providerResponse.invoices,
            page_context: providerResponse.page_context
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
