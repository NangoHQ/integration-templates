import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    paymentId: z.string().uuid().describe('The Xero PaymentID to retrieve. Example: "99ea7f6b-c513-4066-bc27-b7c65dcd76c2"')
});

const AccountSchema = z.object({
    AccountID: z.string().optional(),
    Code: z.string().optional(),
    Name: z.string().optional()
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const InvoiceSchema = z.object({
    InvoiceID: z.string().optional(),
    InvoiceNumber: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    Total: z.number().optional(),
    CurrencyCode: z.string().optional(),
    Contact: ContactSchema.optional()
});

const ValidationErrorSchema = z.object({
    Message: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    PaymentID: z.string().optional(),
    Date: z.string().optional(),
    Amount: z.number().optional(),
    BankAmount: z.number().optional(),
    CurrencyRate: z.number().optional(),
    Reference: z.string().optional(),
    Status: z.string().optional(),
    PaymentType: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    BatchPaymentID: z.string().optional(),
    HasAccount: z.boolean().optional(),
    HasValidationErrors: z.boolean().optional(),
    StatusAttributeString: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Particulars: z.string().optional(),
    Details: z.string().optional(),
    Account: AccountSchema.optional(),
    Invoice: InvoiceSchema.optional(),
    ValidationErrors: z.array(ValidationErrorSchema).optional(),
    Warnings: z.array(ValidationErrorSchema).optional()
});

const ProviderPaymentsResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Payments: z.array(ProviderPaymentSchema).optional()
});

const OutputSchema = z.object({
    PaymentID: z.string().optional(),
    Date: z.string().optional(),
    Amount: z.number().optional(),
    BankAmount: z.number().optional(),
    CurrencyRate: z.number().optional(),
    Reference: z.string().optional(),
    Status: z.string().optional(),
    PaymentType: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    BatchPaymentID: z.string().optional(),
    HasAccount: z.boolean().optional(),
    HasValidationErrors: z.boolean().optional(),
    StatusAttributeString: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Particulars: z.string().optional(),
    Details: z.string().optional(),
    Account: AccountSchema.optional(),
    Invoice: InvoiceSchema.optional(),
    ValidationErrors: z.array(ValidationErrorSchema).optional(),
    Warnings: z.array(ValidationErrorSchema).optional()
});

const action = createAction({
    description: 'Retrieve a payment by PaymentID.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-payment',
        group: 'Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        async function resolveTenantId(): Promise<string> {
            const connection = await nango.getConnection();

            if (
                connection &&
                typeof connection === 'object' &&
                'connection_config' in connection &&
                connection.connection_config &&
                typeof connection.connection_config === 'object' &&
                'tenant_id' in connection.connection_config &&
                typeof connection.connection_config['tenant_id'] === 'string' &&
                connection.connection_config['tenant_id'].length > 0
            ) {
                return connection.connection_config['tenant_id'];
            }

            if (
                connection &&
                typeof connection === 'object' &&
                'metadata' in connection &&
                connection.metadata &&
                typeof connection.metadata === 'object' &&
                'tenantId' in connection.metadata &&
                typeof connection.metadata['tenantId'] === 'string' &&
                connection.metadata['tenantId'].length > 0
            ) {
                return connection.metadata['tenantId'];
            }

            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (
                !connectionsResponse ||
                typeof connectionsResponse !== 'object' ||
                !('data' in connectionsResponse) ||
                !Array.isArray(connectionsResponse.data)
            ) {
                throw new nango.ActionError({
                    type: 'invalid_connections_response',
                    message: 'Unexpected response from GET /Connections.'
                });
            }

            const connections: unknown[] = connectionsResponse.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];

            if (
                !firstConnection ||
                typeof firstConnection !== 'object' ||
                !('tenantId' in firstConnection) ||
                typeof firstConnection['tenantId'] !== 'string' ||
                firstConnection['tenantId'].length === 0
            ) {
                throw new nango.ActionError({
                    type: 'invalid_tenant',
                    message: 'Found a connection but it has no tenantId.'
                });
            }

            return firstConnection['tenantId'];
        }

        const tenantId = await resolveTenantId();

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.get({
            endpoint: `api.xro/2.0/Payments/${input.paymentId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderPaymentsResponseSchema.parse(response.data);

        if (!parsed.Payments || parsed.Payments.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Payment with ID ${input.paymentId} was not found.`,
                paymentId: input.paymentId
            });
        }

        const payment = ProviderPaymentSchema.parse(parsed.Payments[0]);

        return {
            PaymentID: payment.PaymentID,
            Date: payment.Date,
            Amount: payment.Amount,
            BankAmount: payment.BankAmount,
            CurrencyRate: payment.CurrencyRate,
            Reference: payment.Reference,
            Status: payment.Status,
            PaymentType: payment.PaymentType,
            IsReconciled: payment.IsReconciled,
            UpdatedDateUTC: payment.UpdatedDateUTC,
            BatchPaymentID: payment.BatchPaymentID,
            HasAccount: payment.HasAccount,
            HasValidationErrors: payment.HasValidationErrors,
            StatusAttributeString: payment.StatusAttributeString,
            BankAccountNumber: payment.BankAccountNumber,
            Particulars: payment.Particulars,
            Details: payment.Details,
            Account: payment.Account,
            Invoice: payment.Invoice,
            ValidationErrors: payment.ValidationErrors,
            Warnings: payment.Warnings
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
