import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice to mark as sent. Example: "260815000000166042"'),
        organization_id: z.string().describe('ID of the Zoho organization that owns the invoice. Example: "927270289"')
    })
    .describe('Identifies the invoice to mark as sent and the organization it belongs to.');

const StatusChangeResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const InvoiceResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    invoice: z.object({
        invoice_id: z.string(),
        invoice_number: z.string().nullable().optional(),
        status: z.string().nullable().optional()
    })
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice that was marked as sent.'),
        invoice_number: z.string().optional().describe('Human-readable invoice number. Example: "INV-000027"'),
        status: z.string().describe('Invoice status after the transition, as confirmed by a follow-up fetch. Example: "sent"'),
        message: z.string().describe('Status message returned by Zoho for the transition request. Example: "Invoice status has been changed to Sent."')
    })
    .describe('Result of marking an invoice as sent, including its confirmed post-transition status.');

/**
 * @tags: [read, write]
 * @tagReason: Marks the invoice as sent and then re-fetches the invoice to confirm its resulting status.
 * @pitfalls: Marking a non-draft invoice returns success without changing its status (an already paid or overdue invoice keeps its status, so trust the returned status), void invoices reject the transition, and a sent invoice whose due date has passed reports as overdue rather than sent.
 */
const action = createAction({
    description: 'Mark an invoice as sent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const statusResponse = await nango.post<unknown>({
            // https://www.zoho.com/invoice/api/v3/invoices/#mark-an-invoice-as-sent
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}/status/sent`,
            params: {
                organization_id: input.organization_id
            },
            // Repeating the transition on an already-sent invoice returns success, so retrying is safe.
            retries: 3
        });

        const statusResult = StatusChangeResponseSchema.parse(statusResponse.data);

        if (statusResult.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: statusResult.message,
                code: statusResult.code
            });
        }

        const invoiceResponse = await nango.get<unknown>({
            // https://www.zoho.com/invoice/api/v3/invoices/#get-an-invoice
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const invoiceResult = InvoiceResponseSchema.parse(invoiceResponse.data);

        return {
            invoice_id: invoiceResult.invoice.invoice_id,
            ...(invoiceResult.invoice.invoice_number != null && { invoice_number: invoiceResult.invoice.invoice_number }),
            status: invoiceResult.invoice.status ?? 'unknown',
            message: statusResult.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
