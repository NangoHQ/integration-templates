import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        paymentId: z.string().describe('The unique identifier of the payment to delete. Example: "51194409-9530-4ff9-aa72-7c415273c723"')
    })
    .describe('Input for deleting a Xero payment.');

const ProviderInvoiceSchema = z.object({
    InvoiceID: z.string()
});

const ProviderAccountSchema = z.object({
    AccountID: z.string()
});

const ProviderPaymentSchema = z.object({
    PaymentID: z.string(),
    Status: z.string(),
    Invoice: ProviderInvoiceSchema.nullish(),
    Account: ProviderAccountSchema.nullish(),
    Amount: z.number().optional()
});

const ProviderPaymentsWrapperSchema = z.object({
    Payments: z.array(ProviderPaymentSchema)
});

const OutputSchema = z
    .object({
        paymentId: z.string().describe('The unique identifier of the payment.'),
        status: z.string().describe('The status of the payment after deletion, expected to be "DELETED".'),
        invoiceId: z.string().optional().describe('The identifier of the invoice this payment was applied to, if present.'),
        accountId: z.string().optional().describe('The identifier of the bank account used for the payment, if present.'),
        amount: z.number().optional().describe('The amount of the payment, if present.')
    })
    .describe('Output from deleting a Xero payment.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const ConnectionsResponseSchema = z.array(z.object({ tenantId: z.string() }));

/**
 * @tags: [write, destructive]
 * @tagReason: POSTs a status change to DELETED on the provider, reversing the payment.
 * @pitfalls: Once deleted, a payment remains gettable by ID with Status "DELETED" and cannot be deleted again; the linked Invoice AmountPaid and AmountDue revert automatically.
 */
const action = createAction({
    description: 'Delete (reverse) a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/api/accounting/overview
        const connectionResponse = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResponse);

        let tenantId: string | undefined;
        if (
            connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string' && connection.metadata['tenantId'].length > 0) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = ConnectionsResponseSchema.parse(connectionsResponse.data);

            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (firstConnection && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.post({
            endpoint: `api.xro/2.0/Payments/${encodeURIComponent(input.paymentId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Status: 'DELETED'
            },
            retries: 3
        });

        const wrapper = ProviderPaymentsWrapperSchema.parse(response.data);
        const payment = wrapper.Payments[0];

        if (!payment) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Provider returned an empty Payments array after deletion.'
            });
        }

        return {
            paymentId: payment.PaymentID,
            status: payment.Status,
            ...(payment.Invoice != null && { invoiceId: payment.Invoice.InvoiceID }),
            ...(payment.Account != null && { accountId: payment.Account.AccountID }),
            ...(payment.Amount !== undefined && { amount: payment.Amount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
