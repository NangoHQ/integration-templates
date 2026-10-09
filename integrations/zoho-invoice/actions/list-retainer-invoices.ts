import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Invoice organization ID. The provider requires it in practice; pass the same value on every call for a connection. Example: "10234695"'
            ),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Pagination cursor (page number as a string) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Records per page. Default: 200. Max: 200.'),
        filter_by: z
            .string()
            .optional()
            .describe(
                'Filter retainer invoices by status or expected payment date. Allowed values: Status.All, Status.Sent, Status.Draft, Status.OverDue, Status.Paid, Status.Void, Status.Unpaid, Status.PartiallyPaid, Status.Viewed, Date.PaymentExpectedDate.'
            ),
        sort_column: z
            .string()
            .optional()
            .describe('Column to sort by. Allowed values: customer_name, retainer invoice_number, date, due_date, total, balance, created_time.'),
        sort_order: z.string().optional().describe('Sort direction. Allowed values: "A" (ascending) and "D" (descending).')
    })
    .describe('Filters and pagination options for listing Zoho Invoice retainer invoices.');

const RetainerInvoiceSchema = z
    .object({
        retainerinvoice_id: z.string().optional().describe('Unique identifier of the retainer invoice.'),
        customer_name: z.string().optional().describe('Name of the customer the retainer invoice belongs to.'),
        retainerinvoice_number: z.string().optional().describe('Provider-assigned retainer invoice number. Example: "RET-00003"'),
        customer_id: z.string().optional().describe('Unique identifier of the customer.'),
        status: z.string().optional().describe('Retainer invoice status. Allowed values: sent, draft, overdue, paid, void, unpaid, partially_paid, viewed.'),
        reference_number: z.string().optional().describe('Reference number recorded on the retainer invoice.'),
        project_or_estimate_name: z.string().optional().describe('Name of the project or estimate associated with the retainer invoice.'),
        date: z.string().optional().describe('Retainer invoice date in YYYY-MM-DD format.'),
        currency_id: z.string().optional().describe('Unique identifier of the currency.'),
        currency_code: z.string().optional().describe('ISO currency code the retainer invoice is denominated in. Example: "USD"'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the retainer invoice has been viewed in the client portal.'),
        client_viewed_time: z.string().optional().describe('Timestamp of when the retainer invoice was viewed in the client portal; empty when not viewed.'),
        total: z.number().optional().describe('Total amount of the retainer invoice.'),
        balance: z.number().optional().describe('Unpaid balance remaining on the retainer invoice.'),
        created_time: z.string().optional().describe('Creation timestamp of the retainer invoice in ISO-8601 format with offset.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp of the retainer invoice in ISO-8601 format with offset.'),
        is_emailed: z.boolean().optional().describe('Whether the retainer invoice has been emailed to the customer.'),
        last_payment_date: z.string().optional().describe('Date of the last recorded payment against the retainer invoice.'),
        has_attachment: z.boolean().optional().describe('Whether the retainer invoice has an attachment.')
    })
    .passthrough();

const PageContextSchema = z.object({
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional(),
    applied_filter: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    retainerinvoices: z.array(RetainerInvoiceSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        retainerinvoices: z.array(RetainerInvoiceSchema).describe('Retainer invoices returned for the requested page. Empty when the organization has none.'),
        next_cursor: z.string().optional().describe('Cursor (next page number as a string) to pass to a subsequent call when more pages exist.')
    })
    .describe('A page of Zoho Invoice retainer invoices and the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads retainer invoices from the provider without creating, updating, or deleting any data.
 * @pitfalls: organization_id is effectively required: omitting it fails with an organization-not-associated error, and it cannot be discovered through this connection's scope, so pass it explicitly.
 */
const action = createAction({
    description: 'List retainer invoices from Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;

        const params: Record<string, string | number> = {
            ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
            page,
            ...(input.per_page !== undefined && { per_page: input.per_page }),
            ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
            ...(input.sort_column !== undefined && { sort_column: input.sort_column }),
            ...(input.sort_order !== undefined && { sort_order: input.sort_order })
        };

        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/retainer-invoices/#list-retainer-invoices
            endpoint: '/invoice/v3/retainerinvoices',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const retainerinvoices = parsed.retainerinvoices ?? [];
        const nextCursor = parsed.page_context?.has_more_page === true ? String(page + 1) : undefined;

        return {
            retainerinvoices,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
