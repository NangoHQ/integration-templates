import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InvoiceTargetSchema = z.object({
    invoice_id: z.string().describe('Zoho Inventory invoice ID to apply part of the payment to. Example: "260815000000155297"'),
    amount_applied: z.number().positive().describe('Amount of this payment to apply to the invoice. Must not exceed the invoice balance.')
});

const InputSchema = z
    .object({
        customer_id: z.string().describe('Zoho Inventory customer ID that the target invoices belong to. Example: "260815000000097001"'),
        payment_mode: z
            .string()
            .describe('Mode through which payment is made. Common values: check, cash, creditcard, banktransfer, bankremittance, autotransaction, others.'),
        amount: z
            .number()
            .positive()
            .describe(
                'Total amount of the payment. Must equal the sum of amount_applied across the target invoices; a mismatch is rejected before any request is made.'
            ),
        invoices: z.array(InvoiceTargetSchema).min(1).describe('Invoices to apply the payment to. Every entry is validated before any payment is created.'),
        date: z.string().optional().describe('Date the payment is made, in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        reference_number: z.string().optional().describe('Optional reference number stored on the payment (for example a bank or check reference).'),
        description: z.string().optional().describe('Optional free-text note stored on the payment.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Inputs for recording a customer payment against one or more open invoices.');

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice the payment was applied to.'),
    invoice_number: z.string().optional().describe('Display number of the invoice (starts with INV).'),
    amount_applied: z.number().optional().describe('Amount of the payment applied to the invoice.'),
    balance: z.number().optional().describe('Remaining unpaid balance on the invoice after the payment was applied.')
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('ID of the created customer payment.'),
        payment_number: z.string().optional().describe('Server-generated display number of the payment.'),
        customer_id: z.string().optional().describe('ID of the customer the payment belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer the payment belongs to.'),
        payment_mode: z.string().optional().describe('Payment mode recorded on the payment.'),
        amount: z.number().optional().describe('Total amount recorded on the payment.'),
        date: z.string().optional().describe('Date recorded on the payment, in yyyy-mm-dd format.'),
        reference_number: z.string().optional().describe('Reference number recorded on the payment.'),
        description: z.string().optional().describe('Description recorded on the payment.'),
        unused_amount: z
            .number()
            .optional()
            .describe('Portion of the payment Zoho did not apply to any invoice (held as a customer advance). Expected to be 0.'),
        invoices: z.array(AppliedInvoiceSchema).describe('Invoices the payment was applied to, as confirmed by Zoho Inventory.')
    })
    .describe('The created customer payment and the invoices it was applied to.');

const InvoiceResponseSchema = z
    .object({
        code: z.number(),
        message: z.string().optional(),
        invoice: z
            .object({
                invoice_id: z.string(),
                invoice_number: z.string().optional(),
                status: z.string(),
                balance: z.number(),
                customer_id: z.string().optional(),
                customer_name: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const PaymentResponseSchema = z
    .object({
        code: z.number(),
        message: z.string().optional(),
        payment: z
            .object({
                payment_id: z.string(),
                payment_number: z.string().optional(),
                customer_id: z.string().optional(),
                customer_name: z.string().optional(),
                payment_mode: z.string().optional(),
                amount: z.number().optional(),
                date: z.string().optional(),
                reference_number: z.string().optional(),
                description: z.string().optional(),
                unused_amount: z.number().optional(),
                invoices: z
                    .array(
                        z
                            .object({
                                invoice_id: z.string().optional(),
                                invoice_number: z.string().optional(),
                                amount_applied: z.number().optional(),
                                balance: z.number().optional()
                            })
                            .passthrough()
                    )
                    .optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

/**
 * @tags: [read, write]
 * @tagReason: Reads each target invoice to validate its status and balance, then creates a customer payment that applies the amount across those invoices.
 * @pitfalls: Draft invoices pass the pre-flight and Zoho accepts payments against them, so a non-void invoice with a positive balance is not necessarily an issued one; the payment is recorded in a single request, so if the provider rejects any target (for example because the invoice changed after the pre-flight reads) none of the target invoices are paid.
 */
const action = createAction({
    description: 'Record a customer payment and apply it across specific invoices after validating each is open and unpaid.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.customerpayments.ALL', 'ZohoInventory.invoices.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Zoho keeps any amount not allocated to an invoice as an unapplied customer advance, so a mismatch is rejected
        // up front instead of silently recording an advance. Compared at 3-decimal precision to avoid floating-point drift.
        const allocated = input.invoices.reduce((sum, target) => sum + target.amount_applied, 0);
        if (Math.round(allocated * 1000) !== Math.round(input.amount * 1000)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `amount (${input.amount}) must equal the sum of amount_applied across invoices (${allocated}).`
            });
        }

        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const rejections: Array<{ invoice_id: string; reason: string }> = [];

        for (const target of input.invoices) {
            const invoiceConfig: ProxyConfiguration = {
                // https://www.zoho.com/inventory/api/v1/invoices/#get-an-invoice
                endpoint: `/inventory/v1/invoices/${encodeURIComponent(target.invoice_id)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            };
            const invoiceResponse = await nango.get(invoiceConfig);
            const invoiceData = InvoiceResponseSchema.parse(invoiceResponse.data);
            if (invoiceData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: invoiceData.message ?? `Failed to retrieve invoice ${target.invoice_id}.`,
                    code: invoiceData.code
                });
            }
            const invoice = invoiceData.invoice;
            if (!invoice) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: `Zoho Inventory did not return invoice ${target.invoice_id}.`
                });
            }

            if (invoice.status === 'void') {
                rejections.push({ invoice_id: target.invoice_id, reason: 'void' });
            } else if (invoice.balance <= 0) {
                rejections.push({ invoice_id: target.invoice_id, reason: 'already fully paid' });
            }
        }

        if (rejections.length > 0) {
            throw new nango.ActionError({
                type: 'preflight_failed',
                message: `Payment not created: ${rejections.length} target invoice(s) are not payable.`,
                rejections
            });
        }

        const paymentConfig: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/customer-payments/#create-a-payment
            endpoint: '/inventory/v1/customerpayments',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                payment_mode: input.payment_mode,
                amount: input.amount,
                invoices: input.invoices.map((target) => ({
                    invoice_id: target.invoice_id,
                    amount_applied: target.amount_applied
                })),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.description !== undefined && { description: input.description })
            },
            // Not idempotent: a retry after a lost response would record a second payment.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const paymentResponse = await nango.post(paymentConfig);
        const paymentData = PaymentResponseSchema.parse(paymentResponse.data);
        if (paymentData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: paymentData.message ?? 'Failed to record customer payment.',
                code: paymentData.code
            });
        }
        const payment = paymentData.payment;
        if (!payment) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return the created payment.'
            });
        }

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number != null && { payment_number: payment.payment_number }),
            ...(payment.customer_id != null && { customer_id: payment.customer_id }),
            ...(payment.customer_name != null && { customer_name: payment.customer_name }),
            ...(payment.payment_mode != null && { payment_mode: payment.payment_mode }),
            ...(payment.amount != null && { amount: payment.amount }),
            ...(payment.date != null && { date: payment.date }),
            ...(payment.reference_number != null && { reference_number: payment.reference_number }),
            ...(payment.description != null && { description: payment.description }),
            ...(payment.unused_amount != null && { unused_amount: payment.unused_amount }),
            invoices: (payment.invoices ?? []).map((invoice) => ({
                ...(invoice.invoice_id != null && { invoice_id: invoice.invoice_id }),
                ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                ...(invoice.amount_applied != null && { amount_applied: invoice.amount_applied }),
                ...(invoice.balance != null && { balance: invoice.balance })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
