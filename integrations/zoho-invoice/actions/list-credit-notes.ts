import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Example: "927270289"'),
        customer_id: z.string().optional().describe('Only return credit notes raised for this customer. Example: "260815000000097001"'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return credit notes modified after this time. Zoho ISO-8601 format with a timezone offset. Example: "2026-10-01T00:00:00+0000"'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of credit notes per page. Defaults to 200.')
    })
    .describe('Filters and pagination for listing Zoho Invoice credit notes.');

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string(),
    status: z.string(),
    reference_number: z.string().nullish(),
    date: z.string().nullish(),
    issued_date: z.string().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    applied_invoices: z.string().nullish(),
    currency_code: z.string().nullish(),
    currency_id: z.string().nullish(),
    exchange_rate: z.number().nullish(),
    is_emailed: z.boolean().nullish(),
    has_attachment: z.boolean().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    template_id: z.string().nullish(),
    template_type: z.string().nullish(),
    price_precision: z.number().nullish(),
    rounding_mode: z.string().nullish(),
    salesperson_name: z.string().nullish(),
    salesperson_id: z.string().nullish(),
    sales_channel: z.string().nullish(),
    is_viewed_by_client: z.boolean().nullish(),
    client_viewed_time: z.string().nullish(),
    color_code: z.string().nullish(),
    current_sub_status_id: z.string().nullish(),
    current_sub_status: z.string().nullish()
});

const ProviderPageContextSchema = z.object({
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    has_more_page: z.boolean().nullish(),
    report_name: z.string().nullish(),
    sort_column: z.string().nullish(),
    sort_order: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    creditnotes: z.array(ProviderCreditNoteSchema).optional(),
    page_context: ProviderPageContextSchema.optional()
});

const CreditNoteSchema = z.object({
    creditnote_id: z.string().describe('Unique ID of the credit note.'),
    creditnote_number: z.string().describe('Credit note number, prefixed with CN. Example: "CN-00005"'),
    status: z.string().describe('Credit note status: open, draft, closed, or void.'),
    reference_number: z.string().optional().describe('Caller-supplied reference number.'),
    date: z.string().optional().describe('Date the credit note was raised (yyyy-mm-dd).'),
    issued_date: z.string().optional().describe('Date the credit note was issued (yyyy-mm-dd).'),
    total: z.number().optional().describe('Total credits raised by the credit note.'),
    balance: z.number().optional().describe('Unapplied credits remaining on the credit note.'),
    customer_id: z.string().optional().describe('ID of the customer the credit note was raised for.'),
    customer_name: z.string().optional().describe('Name of the customer the credit note was raised for.'),
    applied_invoices: z.string().optional().describe('Comma-separated invoice numbers the credit has been applied to.'),
    currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
    currency_id: z.string().optional().describe('Currency ID.'),
    exchange_rate: z.number().optional().describe('Exchange rate applied to the credit note.'),
    is_emailed: z.boolean().optional().describe('Whether the credit note was emailed to the customer.'),
    has_attachment: z.boolean().optional().describe('Whether the credit note has attachments.'),
    created_time: z.string().optional().describe('Creation timestamp.'),
    last_modified_time: z.string().optional().describe('Last modified timestamp.'),
    template_id: z.string().optional().describe('ID of the template used to render the credit note.'),
    template_type: z.string().optional().describe('Template type. Example: "standard"'),
    price_precision: z.number().optional().describe('Number of decimal places used for prices.'),
    rounding_mode: z.string().optional().describe('Rounding mode applied to totals.'),
    salesperson_name: z.string().optional().describe('Name of the associated salesperson.'),
    salesperson_id: z.string().optional().describe('ID of the associated salesperson.'),
    sales_channel: z.string().optional().describe('Sales channel associated with the credit note.'),
    is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the credit note.'),
    client_viewed_time: z.string().optional().describe('Time the customer viewed the credit note.'),
    color_code: z.string().optional().describe('Color code associated with the credit note.'),
    current_sub_status_id: z.string().optional().describe('ID of the current sub-status.'),
    current_sub_status: z.string().optional().describe('Current sub-status of the credit note.')
});

const PageContextSchema = z.object({
    page: z.number().optional().describe('Current page number.'),
    per_page: z.number().optional().describe('Number of records returned per page.'),
    has_more_page: z.boolean().optional().describe('Whether more pages of credit notes are available.'),
    report_name: z.string().optional().describe('Name of the report backing the list.'),
    sort_column: z.string().optional().describe('Column the results are sorted by.'),
    sort_order: z.string().optional().describe('Sort direction. Example: "D"')
});

const OutputSchema = z
    .object({
        creditnotes: z.array(CreditNoteSchema).describe('Credit notes matching the supplied filters.'),
        page_context: PageContextSchema.describe('Pagination metadata for the returned page.')
    })
    .describe('A page of Zoho Invoice credit notes with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads credit notes from the provider; no provider data is created, changed, or deleted.
 * @pitfalls: organization_id cannot be discovered through this connection because it lacks any settings.* scope (the organizations endpoints return 401), so callers must supply it themselves.
 */
const action = createAction({
    description: 'List credit notes, with optional customer and last_modified_time filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.creditnotes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/creditnotes/
            endpoint: '/invoice/v3/creditnotes',
            params: {
                organization_id: input.organization_id,
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const creditnotes = (parsed.creditnotes ?? []).map((note) => ({
            creditnote_id: note.creditnote_id,
            creditnote_number: note.creditnote_number,
            status: note.status,
            ...(note.reference_number != null && { reference_number: note.reference_number }),
            ...(note.date != null && { date: note.date }),
            ...(note.issued_date != null && { issued_date: note.issued_date }),
            ...(note.total != null && { total: note.total }),
            ...(note.balance != null && { balance: note.balance }),
            ...(note.customer_id != null && { customer_id: note.customer_id }),
            ...(note.customer_name != null && { customer_name: note.customer_name }),
            ...(note.applied_invoices != null && { applied_invoices: note.applied_invoices }),
            ...(note.currency_code != null && { currency_code: note.currency_code }),
            ...(note.currency_id != null && { currency_id: note.currency_id }),
            ...(note.exchange_rate != null && { exchange_rate: note.exchange_rate }),
            ...(note.is_emailed != null && { is_emailed: note.is_emailed }),
            ...(note.has_attachment != null && { has_attachment: note.has_attachment }),
            ...(note.created_time != null && { created_time: note.created_time }),
            ...(note.last_modified_time != null && { last_modified_time: note.last_modified_time }),
            ...(note.template_id != null && { template_id: note.template_id }),
            ...(note.template_type != null && { template_type: note.template_type }),
            ...(note.price_precision != null && { price_precision: note.price_precision }),
            ...(note.rounding_mode != null && { rounding_mode: note.rounding_mode }),
            ...(note.salesperson_name != null && { salesperson_name: note.salesperson_name }),
            ...(note.salesperson_id != null && { salesperson_id: note.salesperson_id }),
            ...(note.sales_channel != null && { sales_channel: note.sales_channel }),
            ...(note.is_viewed_by_client != null && { is_viewed_by_client: note.is_viewed_by_client }),
            ...(note.client_viewed_time != null && { client_viewed_time: note.client_viewed_time }),
            ...(note.color_code != null && { color_code: note.color_code }),
            ...(note.current_sub_status_id != null && { current_sub_status_id: note.current_sub_status_id }),
            ...(note.current_sub_status != null && { current_sub_status: note.current_sub_status })
        }));

        const context = parsed.page_context ?? {};

        return {
            creditnotes,
            page_context: {
                ...(context.page != null && { page: context.page }),
                ...(context.per_page != null && { per_page: context.per_page }),
                ...(context.has_more_page != null && { has_more_page: context.has_more_page }),
                ...(context.report_name != null && { report_name: context.report_name }),
                ...(context.sort_column != null && { sort_column: context.sort_column }),
                ...(context.sort_order != null && { sort_order: context.sort_order })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
