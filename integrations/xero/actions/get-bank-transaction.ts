import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    BankTransactionID: z.string().describe('The unique identifier of the bank transaction to retrieve. Example: "db54aab0-ad40-4ced-bcff-0940ba20db2c"')
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const BankAccountSchema = z.object({
    AccountID: z.string().optional(),
    Code: z.string().optional(),
    Name: z.string().optional()
});

const LineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional(),
    TaxAmount: z.number().optional(),
    LineAmount: z.number().optional()
});

const ProviderBankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    Contact: ContactSchema.optional(),
    Date: z.string().optional(),
    DateString: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    Total: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    LineAmountTypes: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    BankAccount: BankAccountSchema.optional(),
    UpdatedDateUTC: z.string().optional(),
    Url: z.string().optional(),
    HasAttachments: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    BankTransactions: z.array(ProviderBankTransactionSchema).optional()
});

const OutputSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    ContactID: z.string().optional(),
    ContactName: z.string().optional(),
    Date: z.string().optional(),
    DateString: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    Total: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    LineAmountTypes: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    BankAccountID: z.string().optional(),
    BankAccountCode: z.string().optional(),
    BankAccountName: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Url: z.string().optional(),
    HasAttachments: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a bank transaction by BankTransactionID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-bank-transaction',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });

        const parsedConnection = ConnectionSchema.parse(connection);

        let tenantId: string | undefined;

        const connectionConfig = parsedConnection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && !Array.isArray(connectionConfig)) {
            const value = connectionConfig['tenant_id'];
            if (typeof value === 'string') {
                tenantId = value;
            }
        }

        if (!tenantId) {
            const metadata = parsedConnection.metadata;
            if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
                const value = metadata['tenantId'];
                if (typeof value === 'string') {
                    tenantId = value;
                }
            }
        }

        if (!tenantId) {
            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/accounting/connections
                endpoint: 'connections',
                retries: 10
            };

            const connectionsResponse = await nango.get(connectionsConfig);

            const ConnectionsSchema = z.array(
                z.object({
                    tenantId: z.string().optional()
                })
            );

            const connections = ConnectionsSchema.parse(connectionsResponse.data);

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
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            const firstTenantId = firstConnection['tenantId'];
            if (typeof firstTenantId !== 'string') {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No valid tenant ID found in connections response.'
                });
            }

            tenantId = firstTenantId;
        }

        const bankTransactionConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            endpoint: `api.xro/2.0/BankTransactions/${input.BankTransactionID}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        };

        const response = await nango.get(bankTransactionConfig);

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const transactions = parsedResponse.BankTransactions || [];

        if (transactions.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Bank transaction not found for ID: ${input.BankTransactionID}`
            });
        }

        const transaction = transactions[0];
        if (!transaction) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Bank transaction not found for ID: ${input.BankTransactionID}`
            });
        }

        const contact = transaction.Contact;
        const bankAccount = transaction.BankAccount;

        return {
            BankTransactionID: transaction.BankTransactionID,
            ...(transaction.Type !== undefined && { Type: transaction.Type }),
            ...(contact?.ContactID !== undefined && { ContactID: contact.ContactID }),
            ...(contact?.Name !== undefined && { ContactName: contact.Name }),
            ...(transaction.Date !== undefined && { Date: transaction.Date }),
            ...(transaction.DateString !== undefined && { DateString: transaction.DateString }),
            ...(transaction.Status !== undefined && { Status: transaction.Status }),
            ...(transaction.Reference !== undefined && { Reference: transaction.Reference }),
            ...(transaction.IsReconciled !== undefined && { IsReconciled: transaction.IsReconciled }),
            ...(transaction.CurrencyCode !== undefined && { CurrencyCode: transaction.CurrencyCode }),
            ...(transaction.CurrencyRate !== undefined && { CurrencyRate: transaction.CurrencyRate }),
            ...(transaction.Total !== undefined && { Total: transaction.Total }),
            ...(transaction.SubTotal !== undefined && { SubTotal: transaction.SubTotal }),
            ...(transaction.TotalTax !== undefined && { TotalTax: transaction.TotalTax }),
            ...(transaction.LineAmountTypes !== undefined && { LineAmountTypes: transaction.LineAmountTypes }),
            ...(transaction.LineItems !== undefined && { LineItems: transaction.LineItems }),
            ...(bankAccount?.AccountID !== undefined && { BankAccountID: bankAccount.AccountID }),
            ...(bankAccount?.Code !== undefined && { BankAccountCode: bankAccount.Code }),
            ...(bankAccount?.Name !== undefined && { BankAccountName: bankAccount.Name }),
            ...(transaction.UpdatedDateUTC !== undefined && { UpdatedDateUTC: transaction.UpdatedDateUTC }),
            ...(transaction.Url !== undefined && { Url: transaction.Url }),
            ...(transaction.HasAttachments !== undefined && { HasAttachments: transaction.HasAttachments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
