import { z } from 'zod';
import { createAction } from 'nango';

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice this payment was applied to. Example: "260815000000102010"'),
    invoice_number: z.string().optional().describe('Human-readable number of the applied invoice. Example: "INV-000002"'),
    amount_applied: z.number().optional().describe('Amount of this payment applied to the invoice. Example: 750'),
    total: z.number().optional().describe('Total amount of the applied invoice. Example: 750'),
    balance: z.number().optional().describe('Remaining unpaid balance on the applied invoice after this payment. Example: 0'),
    date: z.string().optional().describe('Invoice date in YYYY-MM-DD format. Example: "2026-06-09"'),
    due_date: z.string().optional().describe('Invoice due date in YYYY-MM-DD format. Example: "2026-07-09"')
});

const CheckDetailsSchema = z.object({
    check_id: z.string().optional().describe('ID of the associated check, empty when the payment is not a check.'),
    check_number: z.string().optional().describe('Number of the check, when the payment mode is check.'),
    memo: z.string().optional().describe('Memo recorded on the check.'),
    check_status: z.string().optional().describe('Status of the check.'),
    expiry_date: z.string().optional().describe('Expiry date of the check in YYYY-MM-DD format, when applicable.')
});

const InputSchema = z
    .object({
        payment_id: z.string().describe('ID of the customer payment to retrieve. Example: "260815000000114002"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID that owns the payment. Pass the ID shown in the Zoho Invoice web UI: this connection has no settings scope to discover it, and omitting it fails with "not associated with any organization". Example: "927270289"'
            )
    })
    .describe('Identifies the customer payment to retrieve.');

const OutputSchema = z
    .object({
        payment_id: z.string().describe('Unique ID of the customer payment.'),
        payment_number: z.string().optional().describe('Human-readable payment number. Example: "2"'),
        date: z.string().optional().describe('Date the payment was recorded, in YYYY-MM-DD format. Example: "2026-06-09"'),
        amount: z.number().optional().describe('Payment amount in the organization currency. Example: 750'),
        bcy_amount: z.number().optional().describe('Payment amount converted to the organization base currency. Example: 750'),
        unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice. Example: 0'),
        bcy_unused_amount: z.number().optional().describe('Unapplied payment amount in the organization base currency. Example: 0'),
        bank_charges: z.number().optional().describe('Bank charges deducted from the payment. Example: 0'),
        tax_amount_withheld: z.number().optional().describe('Tax withheld from the payment. Example: 0'),
        description: z.string().optional().describe('Free-text note or description attached to the payment.'),
        reference_number: z.string().optional().describe('Reference number supplied with the payment.'),
        payment_mode: z.string().optional().describe('Payment method, for example "cash", "check" or "banktransfer". Example: "cash"'),
        payment_status: z.string().optional().describe('Payment status reported by Zoho. Example: "paid"'),
        customer_id: z.string().optional().describe('ID of the customer the payment belongs to. Example: "260815000000097001"'),
        customer_name: z.string().optional().describe('Display name of the customer the payment belongs to. Example: "Acme Corp"'),
        currency_code: z.string().optional().describe('ISO 4217 currency code of the payment. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol of the payment. Example: "$"'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the payment. Example: 1'),
        invoices: z.array(AppliedInvoiceSchema).optional().describe('Invoices this payment was applied to.'),
        check_details: CheckDetailsSchema.optional().describe('Check-specific details, populated when the payment mode is check.'),
        created_time: z.string().optional().describe('Timestamp when the payment was created, in Zoho date-time format. Example: "2026-06-09T09:47:45-0400"'),
        updated_time: z
            .string()
            .optional()
            .describe('Timestamp when the payment was last modified, in Zoho date-time format. Example: "2026-06-09T09:47:45-0400"')
    })
    .describe('A single customer payment retrieved from Zoho Invoice.');

const ProviderAppliedInvoiceSchema = z.object({
    invoice_id: z.string().nullish(),
    invoice_number: z.string().nullish(),
    amount_applied: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish()
});

const ProviderCheckDetailsSchema = z.object({
    check_id: z.string().nullish(),
    check_number: z.string().nullish(),
    memo: z.string().nullish(),
    check_status: z.string().nullish(),
    expiry_date: z.string().nullish()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().nullish(),
    date: z.string().nullish(),
    amount: z.number().nullish(),
    bcy_amount: z.number().nullish(),
    unused_amount: z.number().nullish(),
    bcy_unused_amount: z.number().nullish(),
    bank_charges: z.number().nullish(),
    tax_amount_withheld: z.number().nullish(),
    description: z.string().nullish(),
    reference_number: z.string().nullish(),
    payment_mode: z.string().nullish(),
    payment_status: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    currency_code: z.string().nullish(),
    currency_symbol: z.string().nullish(),
    exchange_rate: z.number().nullish(),
    invoices: z.array(ProviderAppliedInvoiceSchema).nullish(),
    check_details: ProviderCheckDetailsSchema.nullish(),
    created_time: z.string().nullish(),
    updated_time: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().nullish(),
    payment: ProviderPaymentSchema.nullish()
});

/**
 * @tags: [read]
 * @tagReason: Reads a single existing customer payment from Zoho Invoice without modifying any provider data.
 * @pitfalls: organization_id cannot be discovered with this connection's scopes, so callers must supply it; omitting it fails with a provider "not associated with any organization" error.
 */
const action = createAction({
    description: 'Retrieve a single customer payment by ID from Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.customerpayments.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/customerpayments/#retrieve-a-payment
            endpoint: `/invoice/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0 || parsed.payment == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: parsed.message ?? 'Customer payment not found.',
                payment_id: input.payment_id
            });
        }

        const payment = parsed.payment;

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number != null && { payment_number: payment.payment_number }),
            ...(payment.date != null && { date: payment.date }),
            ...(payment.amount != null && { amount: payment.amount }),
            ...(payment.bcy_amount != null && { bcy_amount: payment.bcy_amount }),
            ...(payment.unused_amount != null && { unused_amount: payment.unused_amount }),
            ...(payment.bcy_unused_amount != null && { bcy_unused_amount: payment.bcy_unused_amount }),
            ...(payment.bank_charges != null && { bank_charges: payment.bank_charges }),
            ...(payment.tax_amount_withheld != null && { tax_amount_withheld: payment.tax_amount_withheld }),
            ...(payment.description != null && { description: payment.description }),
            ...(payment.reference_number != null && { reference_number: payment.reference_number }),
            ...(payment.payment_mode != null && { payment_mode: payment.payment_mode }),
            ...(payment.payment_status != null && { payment_status: payment.payment_status }),
            ...(payment.customer_id != null && { customer_id: payment.customer_id }),
            ...(payment.customer_name != null && { customer_name: payment.customer_name }),
            ...(payment.currency_code != null && { currency_code: payment.currency_code }),
            ...(payment.currency_symbol != null && { currency_symbol: payment.currency_symbol }),
            ...(payment.exchange_rate != null && { exchange_rate: payment.exchange_rate }),
            ...(payment.invoices != null && {
                invoices: payment.invoices.map((invoice) => ({
                    ...(invoice.invoice_id != null && { invoice_id: invoice.invoice_id }),
                    ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                    ...(invoice.amount_applied != null && { amount_applied: invoice.amount_applied }),
                    ...(invoice.total != null && { total: invoice.total }),
                    ...(invoice.balance != null && { balance: invoice.balance }),
                    ...(invoice.date != null && { date: invoice.date }),
                    ...(invoice.due_date != null && { due_date: invoice.due_date })
                }))
            }),
            ...(payment.check_details != null && {
                check_details: {
                    ...(payment.check_details.check_id != null && { check_id: payment.check_details.check_id }),
                    ...(payment.check_details.check_number != null && { check_number: payment.check_details.check_number }),
                    ...(payment.check_details.memo != null && { memo: payment.check_details.memo }),
                    ...(payment.check_details.check_status != null && { check_status: payment.check_details.check_status }),
                    ...(payment.check_details.expiry_date != null && { expiry_date: payment.check_details.expiry_date })
                }
            }),
            ...(payment.created_time != null && { created_time: payment.created_time }),
            ...(payment.updated_time != null && { updated_time: payment.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
