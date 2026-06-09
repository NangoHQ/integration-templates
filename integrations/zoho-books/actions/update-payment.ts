import { z } from 'zod';
import { createAction } from 'nango';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const InvoicePaymentSchema = z.object({
    invoice_id: z.string().describe('Invoice ID. Example: "260815000000103001"'),
    amount_applied: z.number().describe('Amount paid for the invoice.'),
    tax_amount_withheld: z.number().optional().describe('Amount withheld for tax.')
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_option_id: z.string().optional()
});

const CustomFieldSchema = z.object({
    label: z.string().optional(),
    value: z.string().or(z.number()).optional()
});

const InputSchema = z.object({
    payment_id: z.string().describe('Payment ID. Example: "260815000000113012"'),
    customer_id: z.string().optional().describe('Customer ID. Example: "260815000000097001"'),
    payment_mode: z.string().optional().describe('Mode of payment. Example: "cash"'),
    amount: z.number().optional().describe('Amount paid.'),
    date: z.string().optional().describe('Date of payment. Format: yyyy-mm-dd'),
    reference_number: z.string().nullable().optional().describe('Reference number for the payment.'),
    description: z.string().nullable().optional().describe('Description about the payment.'),
    invoices: z.array(InvoicePaymentSchema).optional(),
    exchange_rate: z.number().optional().describe('Exchange rate for the currency.'),
    bank_charges: z.number().optional().describe('Additional bank charges.'),
    custom_fields: z.array(CustomFieldSchema).optional(),
    location_id: z.string().optional().describe('Location ID.'),
    account_id: z.string().optional().describe('ID of the cash/bank account the payment is deposited into.'),
    retainerinvoice_id: z.string().optional().describe('ID of the retainer invoice associated with the payment.'),
    tags: z.array(TagSchema).optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    invoice_amount: z.number().optional(),
    amount_applied: z.number().optional(),
    balance_amount: z.number().optional(),
    tax_amount_withheld: z.number().optional()
});

const ProviderTagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const ProviderCustomFieldSchema = z.object({
    index: z.number().optional(),
    value: z.string().or(z.number()).optional(),
    label: z.string().optional(),
    data_type: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
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
    invoices: z.array(ProviderInvoiceSchema).optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    tags: z.array(ProviderTagSchema).optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional()
});

const OutputSchema = z.object({
    payment_id: z.string(),
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
    invoices: z.array(ProviderInvoiceSchema).optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    tags: z.array(ProviderTagSchema).optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional()
});

const action = createAction({
    description: 'Update a customer payment in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-payment',
        group: 'Customer Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.customerpayments.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ organization_id?: string }>();
        const organizationId = metadata?.organization_id;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const data: Record<string, unknown> = {
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.payment_mode !== undefined && { payment_mode: input.payment_mode }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.invoices !== undefined && { invoices: input.invoices }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.retainerinvoice_id !== undefined && { retainerinvoice_id: input.retainerinvoice_id }),
            ...(input.tags !== undefined && { tags: input.tags })
        };

        // https://www.zoho.com/books/api/v3/customer-payments/#update-a-payment
        const response = await nango.put({
            endpoint: `/books/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        if (!isPlainObject(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Books API.'
            });
        }

        const payment = response.data['payment'];

        if (!payment || typeof payment !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Payment object missing in response.'
            });
        }

        const providerPayment = ProviderPaymentSchema.parse(payment);

        return {
            payment_id: providerPayment.payment_id,
            ...(providerPayment.payment_mode !== undefined && { payment_mode: providerPayment.payment_mode }),
            ...(providerPayment.amount !== undefined && { amount: providerPayment.amount }),
            ...(providerPayment.amount_refunded !== undefined && { amount_refunded: providerPayment.amount_refunded }),
            ...(providerPayment.bank_charges !== undefined && { bank_charges: providerPayment.bank_charges }),
            ...(providerPayment.date !== undefined && { date: providerPayment.date }),
            ...(providerPayment.status !== undefined && { status: providerPayment.status }),
            ...(providerPayment.reference_number !== undefined && { reference_number: providerPayment.reference_number }),
            ...(providerPayment.description !== undefined && { description: providerPayment.description }),
            ...(providerPayment.customer_id !== undefined && { customer_id: providerPayment.customer_id }),
            ...(providerPayment.customer_name !== undefined && { customer_name: providerPayment.customer_name }),
            ...(providerPayment.email !== undefined && { email: providerPayment.email }),
            ...(providerPayment.invoices !== undefined && { invoices: providerPayment.invoices }),
            ...(providerPayment.currency_code !== undefined && { currency_code: providerPayment.currency_code }),
            ...(providerPayment.currency_symbol !== undefined && { currency_symbol: providerPayment.currency_symbol }),
            ...(providerPayment.location_id !== undefined && { location_id: providerPayment.location_id }),
            ...(providerPayment.location_name !== undefined && { location_name: providerPayment.location_name }),
            ...(providerPayment.tags !== undefined && { tags: providerPayment.tags }),
            ...(providerPayment.custom_fields !== undefined && { custom_fields: providerPayment.custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
