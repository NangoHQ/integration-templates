import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const PaymentInvoiceSchema = z.object({
    invoice_id: z.string().describe('Unique identifier of the invoice to pay. Example: "260815000000170071".'),
    amount_applied: z.number().positive().describe('Amount of this payment to apply to the invoice. Must not exceed the invoice outstanding balance.')
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required by every Zoho Invoice endpoint and cannot be discovered with this connection scope. Example: "927270289".'
            ),
        customer_id: z.string().describe('Customer ID the payment belongs to. Every target invoice must belong to this customer.'),
        payment_mode: z
            .string()
            .describe(
                'Mode through which the payment is made. Example: "cash", "check", "creditcard", "banktransfer", "bankremittance", "autotransaction", "others".'
            ),
        invoices: z
            .array(PaymentInvoiceSchema)
            .min(1)
            .describe(
                'Open invoices to apply the payment to. The action rejects the whole batch without recording a payment if any invoice is missing, paid, void, or over-applied.'
            ),
        amount: z
            .number()
            .positive()
            .optional()
            .describe('Total amount of the payment. Defaults to the sum of the per-invoice amount_applied values when omitted.'),
        date: z.string().optional().describe('Payment date in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        reference_number: z.string().optional().describe('Reference number for the payment. Example: "INV-384".'),
        description: z.string().optional().describe('Free-text description of the payment.')
    })
    .describe('Input for recording a customer payment and applying it across one or more open invoices.');

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    balance: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional()
});

const GetInvoiceResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    invoice: ProviderInvoiceSchema.optional()
});

const ProviderAppliedInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullable().optional(),
    amount_applied: z.number().nullable().optional(),
    balance: z.number().nullable().optional(),
    total: z.number().nullable().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    date: z.string().nullable().optional(),
    payment_mode: z.string().nullable().optional(),
    reference_number: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
    invoices: z.array(ProviderAppliedInvoiceSchema).nullable().optional()
});

const CreatePaymentResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    payment: ProviderPaymentSchema.optional()
});

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().describe('Unique identifier of the invoice the payment was applied to.'),
    invoice_number: z.string().optional().describe('Display number of the invoice. Example: "INV-000019".'),
    amount_applied: z.number().optional().describe('Amount of this payment applied to the invoice.'),
    balance: z.number().optional().describe('Remaining outstanding balance on the invoice after the payment was applied.')
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('Unique identifier of the created customer payment.'),
        payment_number: z.string().optional().describe('Display number of the created customer payment.'),
        customer_id: z.string().describe('Customer ID the payment was recorded against.'),
        customer_name: z.string().optional().describe('Display name of the customer.'),
        amount: z.number().describe('Total amount of the recorded payment.'),
        date: z.string().optional().describe('Date the payment was recorded for, in yyyy-mm-dd format.'),
        payment_mode: z.string().optional().describe('Mode through which the payment was made.'),
        reference_number: z.string().optional().describe('Reference number stored on the payment.'),
        description: z.string().optional().describe('Description stored on the payment.'),
        status: z.string().optional().describe('Payment status reported by the provider.'),
        invoices: z.array(AppliedInvoiceSchema).describe('Per-invoice result of applying the payment, as reported by the provider.')
    })
    .describe('Result of the recorded customer payment, including the per-invoice amounts applied and remaining balances.');

function isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const status = 'status' in error ? error.status : undefined;
    if (status === 404) {
        return true;
    }

    const response = 'response' in error ? error.response : undefined;
    return !!response && typeof response === 'object' && 'status' in response && response.status === 404;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads each target invoice to validate its status and balance before recording the customer payment (write).
 * @pitfalls: organization_id cannot be discovered with this connection's scope, so callers must supply it; if any target invoice is missing, belongs to a different customer, is paid or void, or is over-applied, the whole batch is rejected and no payment is recorded.
 */
const action = createAction({
    description:
        'Record a customer payment and apply it across one or more specific invoices, first validating that each target invoice is actually open/unpaid.',
    version: '1.0.0',
    scopes: ['ZohoInvoice.invoices.ALL', 'ZohoInvoice.customerpayments.ALL'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rejections: { invoice_id: string; reason: string }[] = [];

        for (const target of input.invoices) {
            const getConfig: ProxyConfiguration = {
                // https://www.zoho.com/invoice/api/v3/invoices/#get-an-invoice
                endpoint: `/invoice/v3/invoices/${encodeURIComponent(target.invoice_id)}`,
                params: {
                    organization_id: input.organization_id
                },
                retries: 3
            };

            let invoice: z.infer<typeof ProviderInvoiceSchema> | undefined;

            // @allowTryCatch: a non-existent invoice returns HTTP 404, which the proxy throws; convert it into a clear per-invoice rejection instead of aborting the whole action.
            try {
                const response = await nango.get(getConfig);
                const parsed = GetInvoiceResponseSchema.safeParse(response.data);
                if (parsed.success && parsed.data.code === 0) {
                    invoice = parsed.data.invoice;
                }
            } catch (error) {
                if (!isNotFoundError(error)) {
                    throw error;
                }
                invoice = undefined;
            }

            if (!invoice) {
                rejections.push({ invoice_id: target.invoice_id, reason: 'invoice not found or not accessible' });
                continue;
            }

            if (invoice.customer_id != null && invoice.customer_id !== input.customer_id) {
                rejections.push({ invoice_id: target.invoice_id, reason: `invoice belongs to customer ${invoice.customer_id}, not ${input.customer_id}` });
                continue;
            }

            const status = invoice.status?.toLowerCase();

            if (status === 'paid') {
                rejections.push({ invoice_id: target.invoice_id, reason: 'invoice is already paid' });
                continue;
            }

            if (status === 'void') {
                rejections.push({ invoice_id: target.invoice_id, reason: 'invoice is void' });
                continue;
            }

            const balance = invoice.balance;

            if (balance != null && balance <= 0) {
                rejections.push({ invoice_id: target.invoice_id, reason: `invoice has no outstanding balance (balance ${balance})` });
                continue;
            }

            if (balance != null && target.amount_applied > balance) {
                rejections.push({ invoice_id: target.invoice_id, reason: `amount_applied ${target.amount_applied} exceeds the invoice balance ${balance}` });
                continue;
            }
        }

        if (rejections.length > 0) {
            throw new nango.ActionError({
                type: 'invoices_not_payable',
                message: 'One or more target invoices cannot be paid.',
                rejected_invoices: rejections
            });
        }

        const computedAmount = input.amount ?? input.invoices.reduce((sum, invoice) => sum + invoice.amount_applied, 0);
        const paymentDate = input.date ?? new Date().toISOString().slice(0, 10);

        const paymentConfig: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/customer-payments/#create-a-payment
            endpoint: '/invoice/v3/customerpayments',
            params: {
                organization_id: input.organization_id
            },
            data: {
                customer_id: input.customer_id,
                payment_mode: input.payment_mode,
                amount: computedAmount,
                date: paymentDate,
                invoices: input.invoices.map((invoice) => ({
                    invoice_id: invoice.invoice_id,
                    amount_applied: invoice.amount_applied
                })),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.description !== undefined && { description: input.description })
            },
            // The provider has no idempotency key for payment creation, so a retry after a lost response would record a duplicate payment.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 for this non-idempotent write.
            retries: 0
        };

        const response = await nango.post(paymentConfig);
        const parsed = CreatePaymentResponseSchema.safeParse(response.data);

        if (!parsed.success || parsed.data.code !== 0 || !parsed.data.payment) {
            throw new nango.ActionError({
                type: 'payment_creation_failed',
                message: parsed.success ? (parsed.data.message ?? 'The payment could not be created.') : 'Unexpected response from the provider.'
            });
        }

        const payment = parsed.data.payment;

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number != null && { payment_number: payment.payment_number }),
            customer_id: payment.customer_id ?? input.customer_id,
            ...(payment.customer_name != null && { customer_name: payment.customer_name }),
            amount: payment.amount ?? computedAmount,
            ...(payment.date != null && { date: payment.date }),
            ...(payment.payment_mode != null && { payment_mode: payment.payment_mode }),
            ...(payment.reference_number != null && { reference_number: payment.reference_number }),
            ...(payment.description != null && { description: payment.description }),
            ...(payment.payment_status != null && { status: payment.payment_status }),
            invoices: (payment.invoices ?? []).map((invoice) => ({
                invoice_id: invoice.invoice_id,
                ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                ...(invoice.amount_applied != null && { amount_applied: invoice.amount_applied }),
                ...(invoice.balance != null && { balance: invoice.balance })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
