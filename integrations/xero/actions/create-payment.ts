import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoiceId: z.string().optional().describe('ID of the Invoice to apply the payment to. Provide either invoiceId or creditNoteId, not both.'),
        creditNoteId: z.string().optional().describe('ID of the Credit Note to apply the payment to. Provide either invoiceId or creditNoteId, not both.'),
        accountId: z.string().describe('ID of the bank Account used to make the payment.'),
        date: z.string().describe('Payment date in YYYY-MM-DD format.'),
        amount: z.number().describe('Amount of the payment.'),
        reference: z.string().optional().describe('Optional reference or memo for the payment.')
    })
    .describe('Input for creating a payment against an invoice or credit note.')
    .refine(
        (data) => {
            const hasInvoice = data.invoiceId !== undefined && data.invoiceId.length > 0;
            const hasCreditNote = data.creditNoteId !== undefined && data.creditNoteId.length > 0;
            return (hasInvoice && !hasCreditNote) || (!hasInvoice && hasCreditNote);
        },
        {
            message: 'Provide exactly one of invoiceId or creditNoteId.'
        }
    );

const ProviderPaymentSchema = z.object({
    PaymentID: z.string().optional(),
    Date: z.string().optional(),
    Amount: z.number().optional(),
    Reference: z.string().optional(),
    HasValidationErrors: z.boolean().optional(),
    ValidationErrors: z
        .array(
            z.object({
                Message: z.string().optional()
            })
        )
        .optional(),
    Invoice: z
        .object({
            InvoiceID: z.string(),
            InvoiceNumber: z.string().optional(),
            AmountPaid: z.number().optional(),
            AmountDue: z.number().optional()
        })
        .optional(),
    CreditNote: z
        .object({
            CreditNoteID: z.string(),
            CreditNoteNumber: z.string().optional(),
            AmountPaid: z.number().optional(),
            AmountDue: z.number().optional()
        })
        .optional(),
    Account: z
        .object({
            AccountID: z.string(),
            Name: z.string().optional()
        })
        .optional()
});

const ProviderPaymentsResponseSchema = z.object({
    Payments: z.array(ProviderPaymentSchema)
});

const OutputSchema = z
    .object({
        paymentId: z.string().describe('ID of the created payment.'),
        date: z.string().optional().describe('Payment date.'),
        amount: z.number().optional().describe('Payment amount.'),
        reference: z.string().optional().describe('Payment reference.'),
        invoiceId: z.string().optional().describe('ID of the associated invoice.'),
        invoiceNumber: z.string().optional().describe('Number of the associated invoice.'),
        invoiceAmountPaid: z.number().optional().describe('Total amount paid on the invoice after this payment.'),
        invoiceAmountDue: z.number().optional().describe('Remaining amount due on the invoice after this payment.'),
        creditNoteId: z.string().optional().describe('ID of the associated credit note.'),
        creditNoteNumber: z.string().optional().describe('Number of the associated credit note.'),
        creditNoteAmountPaid: z.number().optional().describe('Total amount paid on the credit note after this payment.'),
        creditNoteAmountDue: z.number().optional().describe('Remaining amount due on the credit note after this payment.'),
        accountId: z.string().optional().describe('ID of the bank account used for the payment.'),
        accountName: z.string().optional().describe('Name of the bank account used for the payment.')
    })
    .describe('The created payment with recalculated invoice or credit note totals.');

/**
 * @tags: [write]
 * @tagReason: Creates a new payment against an invoice or credit note via the Xero Accounting API.
 * @pitfalls: Created payments cannot be updated, only deleted and recreated. The returned date is in Microsoft /Date(...)/ format rather than an ISO string.
 */
const action = createAction({
    description: 'Create a payment against an invoice or credit note.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfig =
            connection !== null && typeof connection === 'object' && 'connection_config' in connection ? connection.connection_config : undefined;
        const metadata = connection !== null && typeof connection === 'object' && 'metadata' in connection ? connection.metadata : undefined;

        const tenantIdFromConfig =
            connectionConfig !== null && typeof connectionConfig === 'object' && typeof connectionConfig['tenant_id'] === 'string'
                ? connectionConfig['tenant_id']
                : undefined;
        const tenantIdFromMetadata =
            metadata !== null && typeof metadata === 'object' && typeof metadata['tenantId'] === 'string' ? metadata['tenantId'] : undefined;

        let tenantId: string | undefined = tenantIdFromConfig || tenantIdFromMetadata;

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/auth-flow/#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 3
            });

            const connectionsData = z.parse(z.object({ data: z.array(z.record(z.string(), z.unknown())) }), connectionsResponse);
            const connections = connectionsData.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (typeof firstConnection?.['tenantId'] === 'string') {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const paymentPayload: Record<string, unknown> = {
            Account: { AccountID: input.accountId },
            Date: input.date,
            Amount: input.amount
        };

        if (input.invoiceId !== undefined && input.invoiceId.length > 0) {
            paymentPayload['Invoice'] = { InvoiceID: input.invoiceId };
        } else if (input.creditNoteId !== undefined && input.creditNoteId.length > 0) {
            paymentPayload['CreditNote'] = { CreditNoteID: input.creditNoteId };
        }

        if (input.reference !== undefined) {
            paymentPayload['Reference'] = input.reference;
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Payments',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Payments: [paymentPayload]
            },
            retries: 3
        });

        const parsedResponse = z.parse(ProviderPaymentsResponseSchema, response.data);
        const payments = parsedResponse.Payments;

        if (payments.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty Payments array.'
            });
        }

        const [payment] = payments;
        if (!payment) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty Payments array.'
            });
        }

        if (payment.HasValidationErrors) {
            const errors =
                payment.ValidationErrors?.map((e) => e.Message)
                    .filter(Boolean)
                    .join(', ') || 'Unknown validation error';
            throw new nango.ActionError({
                type: 'validation_error',
                message: `Payment creation failed: ${errors}`
            });
        }

        if (!payment.PaymentID) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero did not return a PaymentID for the created payment.'
            });
        }

        return {
            paymentId: payment.PaymentID,
            ...(payment.Date !== undefined && { date: payment.Date }),
            ...(payment.Amount !== undefined && { amount: payment.Amount }),
            ...(payment.Reference !== undefined && { reference: payment.Reference }),
            ...(payment.Invoice !== undefined && {
                invoiceId: payment.Invoice.InvoiceID,
                ...(payment.Invoice.InvoiceNumber !== undefined && { invoiceNumber: payment.Invoice.InvoiceNumber }),
                ...(payment.Invoice.AmountPaid !== undefined && { invoiceAmountPaid: payment.Invoice.AmountPaid }),
                ...(payment.Invoice.AmountDue !== undefined && { invoiceAmountDue: payment.Invoice.AmountDue })
            }),
            ...(payment.CreditNote !== undefined && {
                creditNoteId: payment.CreditNote.CreditNoteID,
                ...(payment.CreditNote.CreditNoteNumber !== undefined && {
                    creditNoteNumber: payment.CreditNote.CreditNoteNumber
                }),
                ...(payment.CreditNote.AmountPaid !== undefined && { creditNoteAmountPaid: payment.CreditNote.AmountPaid }),
                ...(payment.CreditNote.AmountDue !== undefined && { creditNoteAmountDue: payment.CreditNote.AmountDue })
            }),
            ...(payment.Account !== undefined && {
                accountId: payment.Account.AccountID,
                ...(payment.Account.Name !== undefined && { accountName: payment.Account.Name })
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
