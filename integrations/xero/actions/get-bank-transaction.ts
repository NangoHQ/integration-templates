import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bankTransactionId: z.string().describe('The Xero BankTransactionID to retrieve. Example: "a3d758d4-1234-5678-90ab-cdefghijklmn"')
});

const OutputSchema = z.object({
    bankTransactionId: z.string(),
    type: z.union([z.string(), z.null()]),
    contactId: z.union([z.string(), z.null()]),
    contactName: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    bankAccountId: z.union([z.string(), z.null()]),
    bankAccountName: z.union([z.string(), z.null()]),
    currencyCode: z.union([z.string(), z.null()]),
    currencyRate: z.union([z.number(), z.null()]),
    subTotal: z.union([z.number(), z.null()]),
    totalTax: z.union([z.number(), z.null()]),
    total: z.union([z.number(), z.null()]),
    reference: z.union([z.string(), z.null()]),
    isReconciled: z.union([z.boolean(), z.null()]),
    updatedAt: z.union([z.string(), z.null()])
});

// Schema for connection config tenant_id
const ConnectionConfigSchema = z.object({
    tenant_id: z.string().optional()
});

// Schema for metadata tenantId
const MetadataSchema = z.object({
    tenantId: z.string().optional()
});

// Schema for connections API response - Xero returns an array directly
const ConnectionSchema = z.object({
    tenantId: z.string()
});

const ConnectionsResponseSchema = z.array(ConnectionSchema);

// Schema for the bank transaction response from Xero
const XeroBankTransactionSchema = z.object({
    BankTransactionID: z.string().optional(),
    Type: z.string().optional(),
    Contact: z
        .object({
            ContactID: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    Date: z.string().optional(),
    Status: z.string().optional(),
    BankAccount: z
        .object({
            AccountID: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional()
});

const XeroBankTransactionsResponseSchema = z.object({
    BankTransactions: z.array(XeroBankTransactionSchema).optional()
});

const action = createAction({
    description: 'Retrieve a bank transaction by BankTransactionID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-bank-transaction',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let tenantId: string | undefined;

        // Resolve tenant ID
        // https://developer.xero.com/documentation/api/accounting/overview#connections
        const connection = await nango.getConnection();

        // 1. Try connection.connection_config['tenant_id']
        const connectionConfigResult = ConnectionConfigSchema.safeParse(connection);
        if (connectionConfigResult.success && connectionConfigResult.data.tenant_id) {
            tenantId = connectionConfigResult.data.tenant_id;
        }

        // 2. Try connection.metadata['tenantId']
        if (!tenantId) {
            const metadataResult = MetadataSchema.safeParse(connection);
            if (metadataResult.success && metadataResult.data.tenantId) {
                tenantId = metadataResult.data.tenantId;
            }
        }

        // 3. Call GET connections and use connections.data[0]['tenantId']
        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsResult = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!connectionsResult.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse connections response from Xero'
                });
            }

            const connections = connectionsResult.data;
            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message:
                        'No Xero tenant found. Please configure a tenant_id in connection_config or use the get-tenants action to set the chosen tenantId in metadata.'
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
                    type: 'no_tenant',
                    message:
                        'No Xero tenant found. Please configure a tenant_id in connection_config or use the get-tenants action to set the chosen tenantId in metadata.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message:
                    'No Xero tenant found. Please configure a tenant_id in connection_config or use the get-tenants action to set the chosen tenantId in metadata.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/banktransactions#get-banktransactions-
        const response = await nango.get({
            endpoint: `api.xro/2.0/BankTransactions/${input.bankTransactionId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const result = XeroBankTransactionsResponseSchema.safeParse(response.data);

        if (!result.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse bank transaction response from Xero',
                error: result.error.message
            });
        }

        const bankTransactions = result.data.BankTransactions;

        if (!bankTransactions || bankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Bank transaction with ID "${input.bankTransactionId}" was not found.`
            });
        }

        const transaction = bankTransactions[0];

        if (transaction === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Bank transaction with ID "${input.bankTransactionId}" was not found.`
            });
        }

        return {
            bankTransactionId: transaction.BankTransactionID || input.bankTransactionId,
            type: transaction.Type || null,
            contactId: transaction.Contact?.ContactID || null,
            contactName: transaction.Contact?.Name || null,
            date: transaction.Date || null,
            status: transaction.Status || null,
            bankAccountId: transaction.BankAccount?.AccountID || null,
            bankAccountName: transaction.BankAccount?.Name || null,
            currencyCode: transaction.CurrencyCode || null,
            currencyRate: transaction.CurrencyRate ?? null,
            subTotal: transaction.SubTotal ?? null,
            totalTax: transaction.TotalTax ?? null,
            total: transaction.Total ?? null,
            reference: transaction.Reference || null,
            isReconciled: transaction.IsReconciled ?? null,
            updatedAt: transaction.UpdatedDateUTC || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
