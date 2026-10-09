import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('ID of the customer making the payment. Example: "260815000000161104"'),
        amount: z.number().positive().describe('Total amount received from the customer. Example: 60'),
        payment_mode: z
            .enum(['cash', 'check', 'creditcard', 'banktransfer', 'bankremittance', 'autotransaction', 'other', 'others'])
            .describe('Mode used to make the payment. Example: "cash"'),
        invoices: z
            .array(
                z.object({
                    invoice_id: z.string().describe('ID of the open invoice to apply this payment to. Example: "260815000000160134"'),
                    amount_applied: z.number().positive().describe('Amount of this payment applied to the invoice. Example: 60'),
                    tax_amount_withheld: z.number().optional().describe('Amount withheld for tax on this invoice allocation. Example: 0')
                })
            )
            .min(1)
            .describe('One or more open invoices to apply this payment against.'),
        date: z.string().optional().describe('Payment date in yyyy-mm-dd format. Defaults to today. Example: "2026-10-09"'),
        reference_number: z.string().optional().describe('Reference number for the payment, up to 100 characters. Example: "INV-000042"'),
        description: z.string().optional().describe('Free-text description of the payment. Example: "Payment for INV-000042"'),
        bank_charges: z.number().optional().describe('Any additional bank charges incurred for the payment. Example: 0'),
        account_id: z.string().optional().describe('ID of the cash or bank account the payment is deposited into. Example: "260815000000000358"'),
        location_id: z.string().optional().describe('ID of the location associated with the payment. Example: "460000000038080"'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the payment currency. Defaults to 1. Example: 1')
    })
    .describe('A payment received from a customer and the invoice allocations it should be applied to.');

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullish(),
    invoice_payment_id: z.string().nullish(),
    amount_applied: z.number().nullish(),
    tax_amount_withheld: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    invoice_amount: z.number().nullish(),
    balance_amount: z.number().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().nullish(),
    payment_mode: z.string().nullish(),
    amount: z.number().nullish(),
    bank_charges: z.number().nullish(),
    date: z.string().nullish(),
    status: z.string().nullish(),
    payment_status: z.string().nullish(),
    reference_number: z.string().nullish(),
    description: z.string().nullish(),
    customer_id: z.string(),
    customer_name: z.string().nullish(),
    unused_amount: z.number().nullish(),
    exchange_rate: z.number().nullish(),
    currency_code: z.string().nullish(),
    currency_symbol: z.string().nullish(),
    account_id: z.string().nullish(),
    account_name: z.string().nullish(),
    location_id: z.string().nullish(),
    location_name: z.string().nullish(),
    tax_amount_withheld: z.number().nullish(),
    invoices: z.array(ProviderInvoiceSchema).nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().nullish(),
    payment: ProviderPaymentSchema.nullish()
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('Unique ID of the created payment. Example: "260815000000163124"'),
        payment_number: z.string().optional().describe('Auto-generated payment number. Example: "29"'),
        payment_mode: z.string().optional().describe('Mode used to make the payment. Example: "cash"'),
        amount: z.number().optional().describe('Total amount received. Example: 60'),
        bank_charges: z.number().optional().describe('Bank charges applied to the payment. Example: 0'),
        date: z.string().optional().describe('Date the payment was recorded, in yyyy-mm-dd format. Example: "2026-10-09"'),
        payment_status: z.string().optional().describe('Payment status reported by Zoho. Example: "paid"'),
        reference_number: z.string().optional().describe('Reference number supplied for the payment. Example: "INV-000042"'),
        description: z.string().optional().describe('Description supplied for the payment. Example: "Payment for INV-000042"'),
        customer_id: z.string().describe('ID of the customer that made the payment. Example: "260815000000161104"'),
        customer_name: z.string().optional().describe('Name of the customer that made the payment. Example: "Nango CCP Test Customer"'),
        unused_amount: z.number().optional().describe('Portion of the payment not applied to any invoice, held as a customer advance. Example: 0'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the payment currency. Example: 1'),
        currency_code: z.string().optional().describe('Currency code of the payment. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol of the payment. Example: "$"'),
        account_id: z.string().optional().describe('ID of the account the payment was deposited into. Example: "260815000000000358"'),
        account_name: z.string().optional().describe('Name of the account the payment was deposited into. Example: "Undeposited Funds"'),
        location_id: z.string().optional().describe('ID of the location associated with the payment. Example: "460000000038080"'),
        location_name: z.string().optional().describe('Name of the location associated with the payment. Example: "Primary"'),
        tax_amount_withheld: z.number().optional().describe('Amount withheld for tax on the payment. Example: 0'),
        invoices: z
            .array(
                z.object({
                    invoice_id: z.string().describe('ID of the invoice the payment was applied to. Example: "260815000000160134"'),
                    invoice_number: z.string().optional().describe('Number of the invoice the payment was applied to. Example: "INV-000042"'),
                    amount_applied: z.number().optional().describe('Amount of the payment applied to this invoice. Example: 60'),
                    tax_amount_withheld: z.number().optional().describe('Amount withheld for tax on this invoice allocation. Example: 0'),
                    invoice_amount: z.number().optional().describe('Total amount of the invoice. Example: 60'),
                    balance_amount: z.number().optional().describe('Remaining unpaid balance of the invoice after this payment. Example: 0'),
                    date: z.string().optional().describe('Invoice date in yyyy-mm-dd format. Example: "2026-10-09"'),
                    due_date: z.string().optional().describe('Invoice due date in yyyy-mm-dd format. Example: "2026-10-09"')
                })
            )
            .optional()
            .describe('Invoice allocations recorded with the payment.')
    })
    .describe('The customer payment that was created and the invoices it was applied to.');

/**
 * @tags: [write]
 * @tagReason: Creates a new customer payment and applies it against invoices, which mutates provider-side financial records.
 * @pitfalls: Zoho's official docs name the generic payment mode "others" while the live API accepts "other" (both are accepted by this input).
 */
const action = createAction({
    description: 'Record a payment from a customer and apply it against one or more of their open invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            customer_id: input.customer_id,
            amount: input.amount,
            payment_mode: input.payment_mode,
            invoices: input.invoices.map((invoice) => ({
                invoice_id: invoice.invoice_id,
                amount_applied: invoice.amount_applied,
                ...(invoice.tax_amount_withheld !== undefined && { tax_amount_withheld: invoice.tax_amount_withheld })
            })),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges }),
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate })
        };

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/customer-payments/#create-a-payment
            endpoint: '/inventory/v1/customerpayments',
            data: payload,
            // Recording a payment is not idempotent: a retry after a lost response would create a duplicate payment.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0 || parsed.payment == null) {
            throw new nango.ActionError({
                type: 'payment_not_created',
                message: parsed.message ?? 'Zoho Inventory did not return a created payment.'
            });
        }

        const payment = parsed.payment;

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number != null && { payment_number: payment.payment_number }),
            ...(payment.payment_mode != null && { payment_mode: payment.payment_mode }),
            ...(payment.amount != null && { amount: payment.amount }),
            ...(payment.bank_charges != null && { bank_charges: payment.bank_charges }),
            ...(payment.date != null && { date: payment.date }),
            ...(payment.payment_status != null && { payment_status: payment.payment_status }),
            ...(payment.reference_number != null && { reference_number: payment.reference_number }),
            ...(payment.description != null && { description: payment.description }),
            customer_id: payment.customer_id,
            ...(payment.customer_name != null && { customer_name: payment.customer_name }),
            ...(payment.unused_amount != null && { unused_amount: payment.unused_amount }),
            ...(payment.exchange_rate != null && { exchange_rate: payment.exchange_rate }),
            ...(payment.currency_code != null && { currency_code: payment.currency_code }),
            ...(payment.currency_symbol != null && { currency_symbol: payment.currency_symbol }),
            ...(payment.account_id != null && { account_id: payment.account_id }),
            ...(payment.account_name != null && { account_name: payment.account_name }),
            ...(payment.location_id != null && { location_id: payment.location_id }),
            ...(payment.location_name != null && { location_name: payment.location_name }),
            ...(payment.tax_amount_withheld != null && { tax_amount_withheld: payment.tax_amount_withheld }),
            ...(payment.invoices != null && {
                invoices: payment.invoices.map((invoice) => {
                    const invoiceAmount = invoice.total ?? invoice.invoice_amount;
                    const balanceAmount = invoice.balance ?? invoice.balance_amount;

                    return {
                        invoice_id: invoice.invoice_id,
                        ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                        ...(invoice.amount_applied != null && { amount_applied: invoice.amount_applied }),
                        ...(invoice.tax_amount_withheld != null && { tax_amount_withheld: invoice.tax_amount_withheld }),
                        ...(invoiceAmount != null && { invoice_amount: invoiceAmount }),
                        ...(balanceAmount != null && { balance_amount: balanceAmount }),
                        ...(invoice.date != null && { date: invoice.date }),
                        ...(invoice.due_date != null && { due_date: invoice.due_date })
                    };
                })
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
