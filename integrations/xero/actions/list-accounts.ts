import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    where: z.string().optional().describe('Filter by any element. Example: Type=="BANK"'),
    order: z.string().optional().describe('Order by any element returned. Example: Name ASC'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of results per page (max 1000).')
});

const AccountSchema = z.object({
    AccountID: z.string().describe('Xero identifier (unique within organisations). Example: "ebd06280-af70-4bed-97c6-7451a454ad85"'),
    Code: z.string().optional().describe('Customer defined alpha numeric account code. Example: "200"'),
    Name: z.string().optional().describe('Name of account. Example: "Sales"'),
    Type: z.string().optional().describe('Account type. Example: "REVENUE"'),
    BankAccountNumber: z.string().optional().describe('For bank accounts only.'),
    Status: z.string().optional().describe('Account status. Example: "ACTIVE"'),
    Description: z.string().optional().describe('Description of the Account.'),
    BankAccountType: z.string().optional().describe('For bank accounts only.'),
    CurrencyCode: z.string().optional().describe('For bank accounts only.'),
    TaxType: z.string().optional().describe('Tax type.'),
    EnablePaymentsToAccount: z.boolean().optional().describe('Whether account can have payments applied to it.'),
    ShowInExpenseClaims: z.boolean().optional().describe('Whether account code is available for use with expense claims.'),
    Class: z.string().optional().describe('Account class type.'),
    ReportingCode: z.string().optional(),
    ReportingCodeName: z.string().optional(),
    SystemAccount: z.string().nullable().optional(),
    AddToWatchlist: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(AccountSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page if more results are available.')
});

const AccountsResponseSchema = z.object({
    Accounts: z.array(AccountSchema).optional()
});

const action = createAction({
    description: 'List accounts in the Xero chart of accounts.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-accounts',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig =
            typeof connection === 'object' && connection !== null && 'connection_config' in connection ? connection['connection_config'] : undefined;
        if (
            typeof connectionConfig === 'object' &&
            connectionConfig !== null &&
            'tenant_id' in connectionConfig &&
            typeof connectionConfig['tenant_id'] === 'string'
        ) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = typeof connection === 'object' && connection !== null && 'metadata' in connection ? connection['metadata'] : undefined;
            if (typeof metadata === 'object' && metadata !== null && 'tenantId' in metadata && typeof metadata['tenantId'] === 'string') {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionItemSchema = z.object({
                id: z.string().optional(),
                tenantId: z.string(),
                tenantName: z.string().optional(),
                tenantType: z.string().optional()
            });
            const ConnectionsResponseSchema = z.array(ConnectionItemSchema);
            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_connections_response',
                    message: 'Failed to parse connections response.'
                });
            }

            if (parsedConnections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant_found',
                    message: 'No tenants found for this connection.'
                });
            }

            if (parsedConnections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants_found',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = parsedConnections.data[0];
            if (firstConnection === undefined) {
                throw new nango.ActionError({
                    type: 'no_tenant_found',
                    message: 'No tenants found for this connection.'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'tenant_id_missing',
                message: 'Could not resolve xero-tenant-id.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid page number.'
            });
        }

        const pageSize = input.page_size ?? 100;

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/accounts
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                ...(input.where !== undefined && { where: input.where }),
                ...(input.order !== undefined && { order: input.order }),
                page: String(page),
                pageSize: String(pageSize)
            },
            retries: 3
        });

        const parsed = AccountsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse accounts response.'
            });
        }

        const items = parsed.data.Accounts ?? [];
        const nextCursor = items.length === pageSize ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
