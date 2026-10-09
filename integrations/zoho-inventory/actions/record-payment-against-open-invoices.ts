import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InvoiceTargetSchema = z.object({
    invoice_id: z.string().describe('Zoho Inventory invoice ID to apply part of the payment to. Example: "260815000000155297"'),
    amount_applied: z.number().describe('Amount of this payment to apply to the invoice. Must not exceed the invoice balance.')
});

const InputSchema = z
    .object({
        customer_id: z.string().describe('Zoho Inventory customer ID that the target invoices belong to. Example: "260815000000097001"'),
        payment_mode: z
            .string()
            .describe('Mode through which payment is made. Common values: check, cash, creditcard, banktransfer, bankremittance, autotransaction, others.'),
        amount: z.number().describe('Total amount of the payment. Should equal the sum of amount_applied across the target invoices.'),
        invoices: z.array(InvoiceTargetSchema).min(1).describe('Invoices to apply the payment to. Every entry is validated before any payment is created.'),
        date: z.string().optional().describe('Date the payment is made, in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        reference_number: z.string().optional().describe('Optional reference number stored on the payment (for example a bank or check reference).'),
        description: z.string().optional().describe('Optional free-text note stored on the payment.'),
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Inventory organization ID. When omitted, the action discovers it from the connected account (see the list-organizations action).')
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
        invoices: z.array(AppliedInvoiceSchema).describe('Invoices the payment was applied to, as confirmed by Zoho Inventory.')
    })
    .describe('The created customer payment and the invoices it was applied to.');

const OrganizationsResponseSchema = z
    .object({
        organizations: z.array(
            z
                .object({
                    organization_id: z.string()
                })
                .passthrough()
        )
    })
    .passthrough();

const InvoiceResponseSchema = z
    .object({
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
    })
    .passthrough();

const PaymentResponseSchema = z
    .object({
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
    scopes: ['ZohoInventory.customerpayments.ALL', 'ZohoInventory.invoices.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (!organizationId) {
            const orgsConfig: ProxyConfiguration = {
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
                endpoint: '/inventory/v1/organizations',
                retries: 3
            };
            const orgsResponse = await nango.get(orgsConfig);
            const orgs = OrganizationsResponseSchema.parse(orgsResponse.data).organizations;

            if (orgs.length === 0) {
                throw new nango.ActionError({
                    type: 'no_organization',
                    message: 'The connected account does not belong to any Zoho Inventory organization.'
                });
            }

            organizationId = orgs[0]?.organization_id;
        }

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'no_organization',
                message: 'Could not determine the Zoho Inventory organization ID for the connection.'
            });
        }

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
            const invoice = InvoiceResponseSchema.parse(invoiceResponse.data).invoice;

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
        const payment = PaymentResponseSchema.parse(paymentResponse.data).payment;

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
