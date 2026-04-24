import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Code: z.string().describe('Account code. Example: "200"'),
    Name: z.string().describe('Name of the account. Example: "Sales"'),
    Type: z.string().describe('Account type. Example: "REVENUE"'),
    BankAccountNumber: z.string().optional().describe('Bank account number (required for BANK type)'),
    Description: z.string().optional().describe('Description of the account'),
    TaxType: z.string().optional().describe('Tax type for the account'),
    EnablePaymentsToAccount: z.boolean().optional().describe('Whether payments can be made to this account'),
    ShowInExpenseClaims: z.boolean().optional().describe('Whether to show in expense claims')
});

const ProviderAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string(),
    Name: z.string(),
    Type: z.string(),
    Status: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional()
});

const ProviderAccountsResponseSchema = z.object({
    Accounts: z.array(ProviderAccountSchema)
});

const OutputSchema = z.object({
    AccountID: z.string(),
    Code: z.string(),
    Name: z.string(),
    Type: z.string(),
    Status: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional()
});

const ConnectionConfigSchema = z.object({
    tenant_id: z.string().optional()
});

const MetadataSchema = z.object({
    tenantId: z.string().optional()
});

const ConnectionsResponseSchema = z.union([z.array(z.object({ tenantId: z.string() })), z.object({ data: z.array(z.object({ tenantId: z.string() })) })]);

const action = createAction({
    description: 'Create an account in the Xero chart of accounts.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();

        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        let tenantId = connectionConfig.tenant_id;

        if (!tenantId) {
            const metadata = MetadataSchema.parse(connection.metadata || {});
            tenantId = metadata.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.parse(connectionsResponse.data);

            let connections: Array<{ tenantId: string }> = [];
            if (Array.isArray(parsedConnections)) {
                connections = parsedConnections;
            } else {
                connections = parsedConnections.data;
            }

            const firstConnection = connections[0];
            if (connections.length === 1 && firstConnection) {
                tenantId = firstConnection.tenantId;
            } else if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'No tenant ID found. Please set tenant_id in connection_config or use the get-tenants action.'
            });
        }

        const requestPayload: Record<string, unknown> = {
            Accounts: [
                {
                    Code: input.Code,
                    Name: input.Name,
                    Type: input.Type,
                    ...(input.BankAccountNumber !== undefined && { BankAccountNumber: input.BankAccountNumber }),
                    ...(input.Description !== undefined && { Description: input.Description }),
                    ...(input.TaxType !== undefined && { TaxType: input.TaxType }),
                    ...(input.EnablePaymentsToAccount !== undefined && { EnablePaymentsToAccount: input.EnablePaymentsToAccount }),
                    ...(input.ShowInExpenseClaims !== undefined && { ShowInExpenseClaims: input.ShowInExpenseClaims })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: requestPayload,
            retries: 10
        });

        const parsed = ProviderAccountsResponseSchema.parse(response.data || {});
        const account = parsed.Accounts[0];

        if (!account) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Account creation failed: no account returned in response.'
            });
        }

        return {
            AccountID: account.AccountID,
            Code: account.Code,
            Name: account.Name,
            Type: account.Type,
            ...(account.Status !== undefined && { Status: account.Status }),
            ...(account.BankAccountNumber !== undefined && { BankAccountNumber: account.BankAccountNumber }),
            ...(account.Description !== undefined && { Description: account.Description }),
            ...(account.TaxType !== undefined && { TaxType: account.TaxType }),
            ...(account.EnablePaymentsToAccount !== undefined && { EnablePaymentsToAccount: account.EnablePaymentsToAccount }),
            ...(account.ShowInExpenseClaims !== undefined && { ShowInExpenseClaims: account.ShowInExpenseClaims })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
