import { z } from 'zod';
import { createAction } from 'nango';

// Bank transaction types
const BankTransactionType = z.enum(['RECEIVE', 'SPEND', 'RECEIVE-OVERPAYMENT', 'RECEIVE-PREPAYMENT', 'SPEND-OVERPAYMENT', 'SPEND-PREPAYMENT', 'TRANSFER']);

// Contact schema (minimal for bank transactions)
const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

// Line item schema
const LineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    TaxAmount: z.number().optional(),
    LineAmount: z.number().optional()
});

// Bank transaction schema
const BankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: BankTransactionType,
    Contact: ContactSchema.optional(),
    Date: z.string(),
    Status: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    BankAccount: z
        .object({
            AccountID: z.string().optional(),
            Code: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    Reference: z.string().optional(),
    IsReconciled: z.boolean().optional(),
    PrepaymentID: z.string().optional(),
    OverpaymentID: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    HasAttachments: z.boolean().optional()
});

// Input schema
const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination (1-based)'),
    where: z.string().optional().describe('Xero where clause filter (e.g., "Status==\'AUTHORISED\'")'),
    order: z.string().optional().describe('Order by clause (e.g., "Date DESC")'),
    ifModifiedSince: z.string().optional().describe('RFC 7231 formatted timestamp to return only modified records')
});

// Output schema
const OutputSchema = z.object({
    bankTransactions: z.array(BankTransactionSchema),
    page: z.number(),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'List bank transactions with filters and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-bank-transactions',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve tenant ID from connection config, metadata, or connections endpoint
        let tenantId: string | null = null;

        // 1. Try connection_config first
        const connection = await nango.getConnection();

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const config = connection.connection_config;
            if ('tenant_id' in config && typeof config['tenant_id'] === 'string') {
                tenantId = config['tenant_id'];
            }
        }

        // 2. Try metadata second
        if (!tenantId) {
            const metadata = await nango.getMetadata<{ tenantId?: string }>();
            if (metadata && typeof metadata === 'object' && 'tenantId' in metadata && typeof metadata.tenantId === 'string') {
                tenantId = metadata.tenantId;
            }
        }

        // 3. Call connections endpoint as last resort
        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'api.xro/2.0/connections',
                retries: 10
            });

            if (connectionsResponse.data && typeof connectionsResponse.data === 'object' && Array.isArray(connectionsResponse.data)) {
                const connections = connectionsResponse.data;
                if (connections.length === 0) {
                    throw new nango.ActionError({
                        type: 'no_tenant',
                        message: 'No Xero tenants found. Please connect a Xero organization.'
                    });
                }
                if (connections.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
                const firstConnection = connections[0];
                if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection && typeof firstConnection.tenantId === 'string') {
                    tenantId = firstConnection.tenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve Xero tenant ID. Please configure tenant_id in connection_config or metadata.'
            });
        }

        // Build request headers
        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.ifModifiedSince) {
            headers['If-Modified-Since'] = input.ifModifiedSince;
        }

        // Build query params
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }

        if (input.where) {
            params['where'] = input.where;
        }

        if (input.order) {
            params['order'] = input.order;
        }

        // Make API request
        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: headers,
            params: params,
            retries: 3
        });

        // Parse response with Zod to avoid type assertions
        const BankTransactionsResponseSchema = z.object({
            BankTransactions: z.array(z.unknown()),
            pagination: z
                .object({
                    page: z.number().optional(),
                    pageSize: z.number().optional(),
                    pageCount: z.number().optional(),
                    itemCount: z.number().optional()
                })
                .optional()
        });

        const parsedResponse = BankTransactionsResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API',
                details: parsedResponse.error.message
            });
        }

        const data = parsedResponse.data;

        // Parse individual bank transactions
        const bankTransactions: z.infer<typeof BankTransactionSchema>[] = [];
        for (const tx of data.BankTransactions) {
            const parsed = BankTransactionSchema.safeParse(tx);
            if (parsed.success) {
                bankTransactions.push(parsed.data);
            }
        }

        const pagination = data.pagination;

        return {
            bankTransactions: bankTransactions,
            page: pagination && typeof pagination.page === 'number' ? pagination.page : input.page || 1,
            totalCount: pagination && typeof pagination.itemCount === 'number' ? pagination.itemCount : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
