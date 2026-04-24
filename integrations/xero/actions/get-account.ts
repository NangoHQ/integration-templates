import { z } from 'zod';
import { createAction } from 'nango';

// https://developer.xero.com/documentation/api/accounting/accounts
const InputSchema = z.object({
    accountId: z.string().describe('The Xero identifier for the account. Example: "99ce6032-0678-4aa0-8148-240c75fee33a"')
});

// https://developer.xero.com/documentation/api/accounting/accounts
const OutputSchema = z.object({
    accountId: z.string(),
    code: z.union([z.string(), z.null()]),
    name: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    taxType: z.union([z.string(), z.null()]),
    class: z.union([z.string(), z.null()]),
    enablePaymentsToAccount: z.union([z.boolean(), z.null()]),
    showInExpenseClaims: z.union([z.boolean(), z.null()]),
    reportingCode: z.union([z.string(), z.null()]),
    reportingCodeName: z.union([z.string(), z.null()]),
    updatedDateUtc: z.union([z.string(), z.null()]),
    bankAccountNumber: z.union([z.string(), z.null()]),
    bankAccountType: z.union([z.string(), z.null()]),
    currencyCode: z.union([z.string(), z.null()]),
    hasAttachments: z.union([z.boolean(), z.null()]),
    addToWatchlist: z.union([z.boolean(), z.null()]),
    systemAccount: z.union([z.string(), z.null()])
});

const ConnectionsResponseSchema = z.array(z.object({}).passthrough());

const AccountsResponseSchema = z.object({
    Accounts: z.array(z.object({}).passthrough())
});

type NangoGet = (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
type Connection = { connection_config?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null };

async function resolveTenantId(nangoGet: NangoGet, connection: Connection): Promise<string> {
    // 1. Check connection_config['tenant_id']
    if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
        return connection.connection_config['tenant_id'];
    }

    // 2. Check metadata['tenantId']
    if (connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
        return connection.metadata['tenantId'];
    }

    // 3. Call GET connections endpoint
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nangoGet({
        endpoint: 'connections',
        retries: 10
    });

    const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
    if (!parsedConnections.success) {
        throw new Error('Failed to parse connections response');
    }

    const connectionsData = parsedConnections.data;
    if (connectionsData.length === 0) {
        throw new Error('No tenants found for this connection');
    }

    if (connectionsData.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = connectionsData[0];
    if (firstConnection === undefined) {
        throw new Error('No connection available');
    }

    const tenantId = firstConnection['tenantId'];
    if (typeof tenantId === 'string') {
        return tenantId;
    }

    throw new Error('Could not resolve tenantId from connections response');
}

const action = createAction({
    description: 'Retrieve an account by AccountID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings', 'accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get connection details to resolve tenant ID
        const connection = await nango.getConnection();
        const tenantId = await resolveTenantId((_config) => nango.get({ endpoint: _config.endpoint, retries: _config.retries }), connection);

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: `api.xro/2.0/Accounts/${input.accountId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedResponse = AccountsResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error('Failed to parse accounts response');
        }

        const responseData = parsedResponse.data;
        if (responseData.Accounts.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Account with ID ${input.accountId} not found`
            });
        }

        const account = responseData.Accounts[0];
        if (account === undefined) {
            throw new Error('Account data unavailable');
        }

        return {
            accountId:
                typeof account['AccountID'] === 'string'
                    ? account['AccountID']
                    : (() => {
                          throw new Error('Account is missing required AccountID');
                      })(),
            code: typeof account['Code'] === 'string' ? account['Code'] : null,
            name: typeof account['Name'] === 'string' ? account['Name'] : null,
            type: typeof account['Type'] === 'string' ? account['Type'] : null,
            status: typeof account['Status'] === 'string' ? account['Status'] : null,
            description: typeof account['Description'] === 'string' ? account['Description'] : null,
            taxType: typeof account['TaxType'] === 'string' ? account['TaxType'] : null,
            class: typeof account['Class'] === 'string' ? account['Class'] : null,
            enablePaymentsToAccount: typeof account['EnablePaymentsToAccount'] === 'boolean' ? account['EnablePaymentsToAccount'] : null,
            showInExpenseClaims: typeof account['ShowInExpenseClaims'] === 'boolean' ? account['ShowInExpenseClaims'] : null,
            reportingCode: typeof account['ReportingCode'] === 'string' ? account['ReportingCode'] : null,
            reportingCodeName: typeof account['ReportingCodeName'] === 'string' ? account['ReportingCodeName'] : null,
            updatedDateUtc: typeof account['UpdatedDateUTC'] === 'string' ? account['UpdatedDateUTC'] : null,
            bankAccountNumber: typeof account['BankAccountNumber'] === 'string' ? account['BankAccountNumber'] : null,
            bankAccountType: typeof account['BankAccountType'] === 'string' ? account['BankAccountType'] : null,
            currencyCode: typeof account['CurrencyCode'] === 'string' ? account['CurrencyCode'] : null,
            hasAttachments: typeof account['HasAttachments'] === 'boolean' ? account['HasAttachments'] : null,
            addToWatchlist: typeof account['AddToWatchlist'] === 'boolean' ? account['AddToWatchlist'] : null,
            systemAccount: typeof account['SystemAccount'] === 'string' ? account['SystemAccount'] : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
