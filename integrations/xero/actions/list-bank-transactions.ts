import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    where: z.string().optional().describe('Filter by any element. Example: Status=="AUTHORISED" AND Type=="SPEND"'),
    order: z.string().optional().describe('Order by any element returned. Example: Reference ASC'),
    if_modified_since: z
        .string()
        .optional()
        .describe(
            'If-Modified-Since header value. A UTC timestamp (yyyy-mm-ddThh:mm:ss). Only bank transactions created or modified since this timestamp will be returned.'
        )
});

const PaginationSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    itemCount: z.number()
});

const BankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    Reference: z.string().optional().nullable(),
    Status: z.string().optional(),
    Contact: z.record(z.string(), z.unknown()).optional().nullable(),
    Date: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    SubTotal: z.number().optional().nullable(),
    TotalTax: z.number().optional().nullable(),
    Total: z.number().optional().nullable(),
    BankAccount: z.record(z.string(), z.unknown()).optional().nullable(),
    IsReconciled: z.boolean().optional().nullable(),
    LineItems: z.array(z.record(z.string(), z.unknown())).optional().nullable()
});

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    pagination: PaginationSchema.optional(),
    BankTransactions: z.array(BankTransactionSchema).optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const XeroConnectionSchema = z.object({
    tenantId: z.string()
});

const OutputSchema = z.object({
    bank_transactions: z.array(BankTransactionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List bank transactions with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-bank-transactions',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/guides/oauth2/tenants
        const connectionResponse = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResponse);

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArraySchema = z.array(XeroConnectionSchema);
            const connections = connectionsArraySchema.parse(connectionsResponse.data);

            if (connections.length === 1) {
                const firstConnection = connections[0];
                if (firstConnection) {
                    tenantId = firstConnection.tenantId;
                }
            } else if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            } else {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid positive page number.'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };
        if (input.where !== undefined && input.where !== '') {
            params['where'] = input.where;
        }
        if (input.order !== undefined && input.order !== '') {
            params['order'] = input.order;
        }

        if (typeof tenantId !== 'string') {
            throw new nango.ActionError({
                type: 'tenant_resolution_failed',
                message: 'Unable to resolve Xero tenant ID.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        if (input.if_modified_since !== undefined && input.if_modified_since !== '') {
            headers['If-Modified-Since'] = input.if_modified_since;
        }

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        const response = await nango.get({
            endpoint: 'api.xro/2.0/BankTransactions',
            params: params,
            headers: headers,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const bankTransactions = providerResponse.BankTransactions ?? [];
        const pagination = providerResponse.pagination;

        const hasNextPage = pagination !== undefined && page < pagination.pageCount;

        return {
            bank_transactions: bankTransactions,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
