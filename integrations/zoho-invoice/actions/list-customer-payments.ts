import { z } from 'zod';
import { createAction } from 'nango';

const ProviderCheckDetailsSchema = z.object({
    check_id: z.string().nullish(),
    check_status: z.string().nullish(),
    check_number: z.string().nullish(),
    memo: z.string().nullish(),
    expiry_date: z.string().nullish()
});

const ProviderAppliedInvoiceSchema = z
    .object({
        invoice_id: z.string().nullish(),
        invoice_number: z.string().nullish(),
        date: z.string().nullish(),
        invoice_amount: z.number().nullish(),
        amount_applied: z.number().nullish(),
        balance_amount: z.number().nullish()
    })
    .passthrough();

const ProviderCustomerPaymentSchema = z
    .object({
        payment_id: z.string(),
        payment_number: z.string().nullish(),
        invoice_numbers: z.string().nullish(),
        date: z.string().nullish(),
        payment_mode: z.string().nullish(),
        payment_mode_formatted: z.string().nullish(),
        amount: z.number().nullish(),
        bcy_amount: z.number().nullish(),
        unused_amount: z.number().nullish(),
        bcy_unused_amount: z.number().nullish(),
        bcy_refunded_amount: z.number().nullish(),
        description: z.string().nullish(),
        reference_number: z.string().nullish(),
        is_paid_via_check: z.boolean().nullish(),
        check_details: ProviderCheckDetailsSchema.nullish(),
        customer_id: z.string().nullish(),
        customer_name: z.string().nullish(),
        created_time: z.string().nullish(),
        last_modified_time: z.string().nullish(),
        last_four_digits: z.string().nullish(),
        gateway_transaction_id: z.string().nullish(),
        payment_gateway: z.string().nullish(),
        payment_type: z.string().nullish(),
        payment_status: z.string().nullish(),
        settlement_status: z.string().nullish(),
        sales_channel: z.string().nullish(),
        tax_amount_withheld: z.number().nullish(),
        has_attachment: z.boolean().nullish(),
        documents: z.string().nullish(),
        applied_invoices: z.array(ProviderAppliedInvoiceSchema).nullish()
    })
    .passthrough();

const PageContextSchema = z.object({
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    has_more_page: z.boolean().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    customerpayments: z.array(ProviderCustomerPaymentSchema).optional(),
    page_context: PageContextSchema.nullable().optional()
});

const CheckDetailsSchema = z.object({
    check_id: z.string().optional().describe('Unique identifier of the check associated with the payment.'),
    check_status: z.string().optional().describe('Status of the check.'),
    check_number: z.string().optional().describe('Check number.'),
    memo: z.string().optional().describe('Memo recorded against the check.'),
    expiry_date: z.string().optional().describe('Expiry date of the check.')
});

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice this payment was applied to.'),
    invoice_number: z.string().optional().describe('Display number of the invoice this payment was applied to.'),
    date: z.string().optional().describe('Invoice date in YYYY-MM-DD format.'),
    invoice_amount: z.number().optional().describe('Total amount of the invoice.'),
    amount_applied: z.number().optional().describe('Amount of this payment applied to the invoice.'),
    balance_amount: z.number().optional().describe('Remaining balance of the invoice after applying this payment.')
});

const CustomerPaymentSchema = z.object({
    payment_id: z.string().describe('Unique identifier of the customer payment.'),
    payment_number: z.string().optional().describe('Display number of the payment.'),
    invoice_numbers: z.string().optional().describe('Comma-separated invoice numbers this payment is associated with.'),
    date: z.string().optional().describe('Date the payment was made, in YYYY-MM-DD format.'),
    payment_mode: z.string().optional().describe('Mode of the payment, e.g. "cash", "check", "banktransfer".'),
    payment_mode_formatted: z.string().optional().describe('Human-readable form of the payment mode.'),
    amount: z.number().optional().describe('Amount of the payment in the organization currency.'),
    bcy_amount: z.number().optional().describe('Amount of the payment in the base currency.'),
    unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice.'),
    bcy_unused_amount: z.number().optional().describe('Unapplied amount of the payment in the base currency.'),
    bcy_refunded_amount: z.number().optional().describe('Refunded amount of the payment in the base currency.'),
    description: z.string().optional().describe('Description or notes recorded on the payment.'),
    reference_number: z.string().optional().describe('Reference number recorded on the payment.'),
    is_paid_via_check: z.boolean().optional().describe('Whether the payment was made by check.'),
    check_details: CheckDetailsSchema.optional().describe('Check details, when the payment was made by check.'),
    customer_id: z.string().optional().describe('ID of the customer who made the payment.'),
    customer_name: z.string().optional().describe('Name of the customer who made the payment.'),
    created_time: z.string().optional().describe('Timestamp when the payment was created.'),
    last_modified_time: z.string().optional().describe('Timestamp when the payment was last modified.'),
    last_four_digits: z.string().optional().describe('Last four digits of the card, when paid by card.'),
    gateway_transaction_id: z.string().optional().describe('Transaction ID returned by the payment gateway, when applicable.'),
    payment_gateway: z.string().optional().describe('Payment gateway used, when applicable.'),
    payment_type: z.string().optional().describe('Type of the payment, e.g. "Invoice Payment".'),
    payment_status: z.string().optional().describe('Status of the payment.'),
    settlement_status: z.string().optional().describe('Settlement status of the payment.'),
    sales_channel: z.string().optional().describe('Sales channel associated with the payment.'),
    tax_amount_withheld: z.number().optional().describe('Tax amount withheld from the payment.'),
    has_attachment: z.boolean().optional().describe('Whether the payment has an attachment.'),
    documents: z.string().optional().describe('Document associated with the payment.'),
    applied_invoices: z.array(AppliedInvoiceSchema).optional().describe('Invoices this payment has been applied to.')
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe("ID of the Zoho Invoice organization. Required on every request; it cannot be resolved through this connection's granted scopes."),
        customer_id: z.string().optional().describe('Only return payments made by the customer with this ID.'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return payments modified at or after this timestamp (ISO-8601, e.g. "2026-10-01T00:00:00+0000"). Used for incremental fetching.'),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Page number to fetch, taken from the next_cursor of a previous response. Omit to fetch the first page.'),
        per_page: z.number().int().positive().optional().describe('Number of payments to return per page. Defaults to the provider default of 200.')
    })
    .describe('Filters for listing customer payments.');

const OutputSchema = z
    .object({
        customerpayments: z.array(CustomerPaymentSchema).describe('Customer payments matching the provided filters.'),
        next_cursor: z.string().optional().describe('Page number to pass as cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of customer payments.');

type ProviderCustomerPayment = z.infer<typeof ProviderCustomerPaymentSchema>;
type OutputCustomerPayment = z.infer<typeof CustomerPaymentSchema>;

function mapCheckDetails(details: NonNullable<ProviderCustomerPayment['check_details']>): NonNullable<OutputCustomerPayment['check_details']> {
    return {
        ...(details.check_id != null ? { check_id: details.check_id } : {}),
        ...(details.check_status != null ? { check_status: details.check_status } : {}),
        ...(details.check_number != null ? { check_number: details.check_number } : {}),
        ...(details.memo != null ? { memo: details.memo } : {}),
        ...(details.expiry_date != null ? { expiry_date: details.expiry_date } : {})
    };
}

function mapAppliedInvoice(invoice: z.infer<typeof ProviderAppliedInvoiceSchema>): z.infer<typeof AppliedInvoiceSchema> {
    return {
        ...(invoice.invoice_id != null ? { invoice_id: invoice.invoice_id } : {}),
        ...(invoice.invoice_number != null ? { invoice_number: invoice.invoice_number } : {}),
        ...(invoice.date != null ? { date: invoice.date } : {}),
        ...(invoice.invoice_amount != null ? { invoice_amount: invoice.invoice_amount } : {}),
        ...(invoice.amount_applied != null ? { amount_applied: invoice.amount_applied } : {}),
        ...(invoice.balance_amount != null ? { balance_amount: invoice.balance_amount } : {})
    };
}

function mapCustomerPayment(payment: ProviderCustomerPayment): OutputCustomerPayment {
    return {
        payment_id: payment.payment_id,
        ...(payment.payment_number != null ? { payment_number: payment.payment_number } : {}),
        ...(payment.invoice_numbers != null ? { invoice_numbers: payment.invoice_numbers } : {}),
        ...(payment.date != null ? { date: payment.date } : {}),
        ...(payment.payment_mode != null ? { payment_mode: payment.payment_mode } : {}),
        ...(payment.payment_mode_formatted != null ? { payment_mode_formatted: payment.payment_mode_formatted } : {}),
        ...(payment.amount != null ? { amount: payment.amount } : {}),
        ...(payment.bcy_amount != null ? { bcy_amount: payment.bcy_amount } : {}),
        ...(payment.unused_amount != null ? { unused_amount: payment.unused_amount } : {}),
        ...(payment.bcy_unused_amount != null ? { bcy_unused_amount: payment.bcy_unused_amount } : {}),
        ...(payment.bcy_refunded_amount != null ? { bcy_refunded_amount: payment.bcy_refunded_amount } : {}),
        ...(payment.description != null ? { description: payment.description } : {}),
        ...(payment.reference_number != null ? { reference_number: payment.reference_number } : {}),
        ...(payment.is_paid_via_check != null ? { is_paid_via_check: payment.is_paid_via_check } : {}),
        ...(payment.check_details != null ? { check_details: mapCheckDetails(payment.check_details) } : {}),
        ...(payment.customer_id != null ? { customer_id: payment.customer_id } : {}),
        ...(payment.customer_name != null ? { customer_name: payment.customer_name } : {}),
        ...(payment.created_time != null ? { created_time: payment.created_time } : {}),
        ...(payment.last_modified_time != null ? { last_modified_time: payment.last_modified_time } : {}),
        ...(payment.last_four_digits != null ? { last_four_digits: payment.last_four_digits } : {}),
        ...(payment.gateway_transaction_id != null ? { gateway_transaction_id: payment.gateway_transaction_id } : {}),
        ...(payment.payment_gateway != null ? { payment_gateway: payment.payment_gateway } : {}),
        ...(payment.payment_type != null ? { payment_type: payment.payment_type } : {}),
        ...(payment.payment_status != null ? { payment_status: payment.payment_status } : {}),
        ...(payment.settlement_status != null ? { settlement_status: payment.settlement_status } : {}),
        ...(payment.sales_channel != null ? { sales_channel: payment.sales_channel } : {}),
        ...(payment.tax_amount_withheld != null ? { tax_amount_withheld: payment.tax_amount_withheld } : {}),
        ...(payment.has_attachment != null ? { has_attachment: payment.has_attachment } : {}),
        ...(payment.documents != null ? { documents: payment.documents } : {}),
        ...(payment.applied_invoices != null ? { applied_invoices: payment.applied_invoices.map(mapAppliedInvoice) } : {})
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads customer payment records from the provider; no provider state is created, modified, or deleted.
 * @pitfalls: organization_id is required and cannot be discovered through this connection's granted scopes; results are returned one page at a time (200 per page by default), so follow next_cursor until it is absent to avoid silently missing payments.
 */
const action = createAction({
    description: 'List customer payments, with optional customer and last_modified_time filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.customerpayments.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/customer-payments/#list-customer-payments
        const response = await nango.get<unknown>({
            endpoint: '/invoice/v3/customerpayments',
            params: {
                organization_id: input.organization_id,
                ...(input.customer_id != null && { customer_id: input.customer_id }),
                ...(input.last_modified_time != null && { last_modified_time: input.last_modified_time }),
                ...(input.cursor != null && { page: input.cursor }),
                ...(input.per_page != null && { per_page: input.per_page })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const payments = providerResponse.customerpayments ?? [];

        const pageContext = providerResponse.page_context;
        const hasMorePages = pageContext?.has_more_page === true;
        const nextPage = pageContext?.page != null ? pageContext.page + 1 : undefined;
        const nextCursor = hasMorePages && nextPage != null ? String(nextPage) : undefined;

        return {
            customerpayments: payments.map(mapCustomerPayment),
            ...(nextCursor != null ? { next_cursor: nextCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
