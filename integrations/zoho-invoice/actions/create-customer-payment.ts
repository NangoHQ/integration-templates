import { z } from 'zod';
import { createAction } from 'nango';

const InvoiceApplicationSchema = z.object({
    invoice_id: z.string().describe('ID of the invoice to apply part of the payment to. Example: "260815000000160027"'),
    amount_applied: z.number().describe('Amount of the payment applied to this invoice. Must not exceed the invoice balance.')
});

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Required because this connection cannot list organizations. Example: "927270289"'),
        customer_id: z.string().describe('ID of the customer the payment is from. Example: "260815000000097001"'),
        amount: z.number().describe('Total amount of the payment. Example: 100.0'),
        payment_mode: z
            .string()
            .optional()
            .describe('Mode of payment: cash, check, creditcard, banktransfer, bankremittance, autotransaction, or others. Defaults to cash when omitted.'),
        date: z.string().optional().describe('Payment date in yyyy-mm-dd format. Defaults to today when omitted.'),
        invoices: z
            .array(InvoiceApplicationSchema)
            .optional()
            .describe('Invoices to apply the payment to. Omit to record an unapplied advance payment instead.'),
        reference_number: z.string().optional().describe('Reference number for the payment.'),
        description: z.string().optional().describe('Description of the payment.'),
        bank_charges: z.number().optional().describe('Additional bank charges.'),
        exchange_rate: z.number().optional().describe('Exchange rate between the invoice currency and the customer currency. Defaults to 1.')
    })
    .describe('Input for recording a customer payment in Zoho Invoice.');

const ProviderInvoiceApplicationSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_payment_id: z.string().optional(),
    invoice_number: z.string().optional(),
    amount_applied: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    date: z.string().optional(),
    due_date: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    payment_mode: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    unused_amount: z.number().optional(),
    bank_charges: z.number().optional(),
    exchange_rate: z.number().optional(),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    payment_status: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    invoices: z.array(ProviderInvoiceApplicationSchema).optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    payment: ProviderPaymentSchema.optional()
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('Unique ID of the created payment.'),
        payment_number: z.string().optional().describe('Sequential number assigned to the payment.'),
        customer_id: z.string().optional().describe('ID of the customer the payment is from.'),
        customer_name: z.string().optional().describe('Name of the customer the payment is from.'),
        payment_mode: z.string().optional().describe('Mode through which the payment was made.'),
        date: z.string().optional().describe('Date on which the payment was made (yyyy-mm-dd).'),
        amount: z.number().optional().describe('Total amount of the payment.'),
        unused_amount: z.number().optional().describe('Portion of the payment not applied to any invoice (advance credit).'),
        bank_charges: z.number().optional().describe('Additional bank charges included in the payment.'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the payment.'),
        reference_number: z.string().optional().describe('Reference number of the payment.'),
        description: z.string().optional().describe('Description of the payment.'),
        payment_status: z.string().optional().describe('Provider status of the payment.'),
        currency_code: z.string().optional().describe('Currency code of the payment.'),
        currency_symbol: z.string().optional().describe('Currency symbol of the payment.'),
        invoices: z
            .array(
                z.object({
                    invoice_id: z.string().optional().describe('ID of the invoice the payment was applied to.'),
                    invoice_payment_id: z.string().optional().describe('ID linking this payment to the invoice.'),
                    invoice_number: z.string().optional().describe('Number of the invoice the payment was applied to.'),
                    amount_applied: z.number().optional().describe('Amount of the payment applied to this invoice.'),
                    total: z.number().optional().describe('Total amount of the invoice.'),
                    balance: z.number().optional().describe('Remaining unpaid balance of the invoice after applying the payment.'),
                    date: z.string().optional().describe('Date on which the invoice was raised.'),
                    due_date: z.string().optional().describe('Date on which the invoice is due.')
                })
            )
            .optional()
            .describe('Invoices the payment was applied to, as echoed by the provider.')
    })
    .describe('The customer payment created in Zoho Invoice.');

/**
 * @tags: [write]
 * @tagReason: Creates a new customer payment record in the provider.
 * @pitfalls: Omitting invoices records an unapplied advance payment instead of applying the amount, and omitting payment_mode or date makes the provider default them to cash and today. Applying more than an invoice's balance or referencing a non-existent invoice fails with a provider error, and the create response may not reflect the applied effect, so invoice balances should be re-checked separately.
 */
const action = createAction({
    description: 'Record a customer payment, optionally applying it against one or more specific invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.customerpayments.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            customer_id: input.customer_id,
            amount: input.amount,
            ...(input.payment_mode !== undefined && { payment_mode: input.payment_mode }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.invoices !== undefined && {
                invoices: input.invoices.map((invoice) => ({
                    invoice_id: invoice.invoice_id,
                    amount_applied: invoice.amount_applied
                }))
            }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate })
        };

        // https://www.zoho.com/invoice/api/v3/customer-payments/#create-a-payment
        const response = await nango.post({
            endpoint: '/invoice/v3/customerpayments',
            params: {
                organization_id: input.organization_id
            },
            data: payload,
            // Non-idempotent: each successful call creates a new payment and the API has no idempotency key.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const responseData = ProviderResponseSchema.parse(response.data);

        if (responseData.code !== 0 || !responseData.payment) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: responseData.message || 'Zoho Invoice did not return a payment object.'
            });
        }

        const payment = responseData.payment;

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number !== undefined && { payment_number: payment.payment_number }),
            ...(payment.customer_id !== undefined && { customer_id: payment.customer_id }),
            ...(payment.customer_name !== undefined && { customer_name: payment.customer_name }),
            ...(payment.payment_mode !== undefined && { payment_mode: payment.payment_mode }),
            ...(payment.date !== undefined && { date: payment.date }),
            ...(payment.amount !== undefined && { amount: payment.amount }),
            ...(payment.unused_amount !== undefined && { unused_amount: payment.unused_amount }),
            ...(payment.bank_charges !== undefined && { bank_charges: payment.bank_charges }),
            ...(payment.exchange_rate !== undefined && { exchange_rate: payment.exchange_rate }),
            ...(payment.reference_number !== undefined && { reference_number: payment.reference_number }),
            ...(payment.description !== undefined && { description: payment.description }),
            ...(payment.payment_status !== undefined && { payment_status: payment.payment_status }),
            ...(payment.currency_code !== undefined && { currency_code: payment.currency_code }),
            ...(payment.currency_symbol !== undefined && { currency_symbol: payment.currency_symbol }),
            ...(payment.invoices !== undefined && {
                invoices: payment.invoices.map((invoice) => ({
                    ...(invoice.invoice_id !== undefined && { invoice_id: invoice.invoice_id }),
                    ...(invoice.invoice_payment_id !== undefined && { invoice_payment_id: invoice.invoice_payment_id }),
                    ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
                    ...(invoice.amount_applied !== undefined && { amount_applied: invoice.amount_applied }),
                    ...(invoice.total !== undefined && { total: invoice.total }),
                    ...(invoice.balance !== undefined && { balance: invoice.balance }),
                    ...(invoice.date !== undefined && { date: invoice.date }),
                    ...(invoice.due_date !== undefined && { due_date: invoice.due_date })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
