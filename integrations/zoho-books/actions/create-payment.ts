import { z } from 'zod';
import { createAction } from 'nango';

const InvoicePaymentSchema = z.object({
    invoice_id: z.string().describe('Invoice ID to apply payment to. Example: "260815000000101011"'),
    amount_applied: z.number().describe('Amount applied to this invoice.'),
    tax_amount_withheld: z.number().optional().describe('Tax amount withheld.')
});

const InputSchema = z.object({
    customer_id: z.string().describe('Customer ID for the payment. Example: "260815000000097001"'),
    payment_mode: z.string().describe('Payment mode: cash, check, creditcard, banktransfer, bankremittance, autotransaction, or others.'),
    amount: z.number().describe('Total payment amount.'),
    date: z.string().describe('Payment date in yyyy-mm-dd format.'),
    invoices: z.array(InvoicePaymentSchema).describe('Invoices to apply the payment to.'),
    reference_number: z.string().optional().describe('Reference number for the payment.'),
    description: z.string().optional().describe('Description of the payment.'),
    account_id: z.string().optional().describe('Cash/bank account ID to deposit the payment into.'),
    exchange_rate: z.number().optional().describe('Exchange rate for the currency.'),
    bank_charges: z.number().optional().describe('Additional bank charges.')
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string().optional(),
    payment_mode: z.string().optional(),
    amount: z.number().optional(),
    amount_refunded: z.number().optional(),
    bank_charges: z.number().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    email: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    invoices: z
        .array(
            z.object({
                invoice_id: z.string().optional(),
                invoice_number: z.string().optional(),
                date: z.string().optional(),
                invoice_amount: z.number().optional(),
                amount_applied: z.number().optional(),
                balance_amount: z.number().optional(),
                tax_amount_withheld: z.number().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    payment_id: z.string().describe('Unique ID of the created payment.'),
    payment_mode: z.string().optional().describe('Mode through which payment was made.'),
    amount: z.number().optional().describe('Payment amount.'),
    amount_refunded: z.number().optional().describe('Amount refunded.'),
    bank_charges: z.number().optional().describe('Bank charges.'),
    date: z.string().optional().describe('Payment date.'),
    status: z.string().optional().describe('Payment status: success or failure.'),
    reference_number: z.string().optional().describe('Reference number.'),
    description: z.string().optional().describe('Payment description.'),
    customer_id: z.string().optional().describe('Customer ID.'),
    customer_name: z.string().optional().describe('Customer name.'),
    email: z.string().optional().describe('Customer email.'),
    currency_code: z.string().optional().describe('Currency code.'),
    currency_symbol: z.string().optional().describe('Currency symbol.'),
    location_id: z.string().optional().describe('Location ID.'),
    location_name: z.string().optional().describe('Location name.'),
    invoices: z
        .array(
            z.object({
                invoice_id: z.string().optional(),
                invoice_number: z.string().optional(),
                date: z.string().optional(),
                invoice_amount: z.number().optional(),
                amount_applied: z.number().optional(),
                balance_amount: z.number().optional(),
                tax_amount_withheld: z.number().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a customer payment in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.customerpayments.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ organization_id?: string }>();
        const organizationId = metadata?.organization_id;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'organization_id is required in connection metadata.'
            });
        }

        const payload = {
            customer_id: input.customer_id,
            payment_mode: input.payment_mode,
            amount: input.amount,
            date: input.date,
            invoices: input.invoices.map((inv) => ({
                invoice_id: inv.invoice_id,
                amount_applied: inv.amount_applied,
                ...(inv.tax_amount_withheld !== undefined && { tax_amount_withheld: inv.tax_amount_withheld })
            })),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges })
        };

        // https://www.zoho.com/books/api/v3/customer-payments/#create-a-payment
        const response = await nango.post({
            endpoint: '/books/v3/customerpayments',
            params: {
                organization_id: organizationId
            },
            data: payload,
            retries: 3
        });

        const responseData = z
            .object({
                payment: z.unknown().optional()
            })
            .parse(response.data);

        if (!responseData.payment) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a payment object.'
            });
        }

        const providerPayment = ProviderPaymentSchema.parse(responseData.payment);

        return {
            payment_id: providerPayment.payment_id ?? '',
            payment_mode: providerPayment.payment_mode,
            amount: providerPayment.amount,
            amount_refunded: providerPayment.amount_refunded,
            bank_charges: providerPayment.bank_charges,
            date: providerPayment.date,
            status: providerPayment.status,
            reference_number: providerPayment.reference_number,
            description: providerPayment.description,
            customer_id: providerPayment.customer_id,
            customer_name: providerPayment.customer_name,
            email: providerPayment.email,
            currency_code: providerPayment.currency_code,
            currency_symbol: providerPayment.currency_symbol,
            location_id: providerPayment.location_id,
            location_name: providerPayment.location_name,
            invoices: providerPayment.invoices
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
