import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for creating a Xero account
const InputSchema = z.object({
    code: z.string().describe('Unique account code. Example: "200"'),
    name: z.string().describe('Name of the account. Example: "Sales Revenue"'),
    type: z
        .enum([
            'BANK',
            'CURRENT',
            'CURRLIAB',
            'DEPRECIATN',
            'DIRECTCOSTS',
            'EQUITY',
            'EXPENSE',
            'FIXED',
            'INVENTORY',
            'LIABILITY',
            'NONCURRENT',
            'OTHERINCOME',
            'OVERHEADS',
            'PREPAYMENT',
            'REVENUE',
            'SALES',
            'TERMLIAB'
        ])
        .describe('Account type classification'),
    description: z.string().optional().describe('Description of the account'),
    tax_type: z.string().optional().describe('Tax type for the account. Example: "OUTPUT"'),
    enable_payments_to_account: z.boolean().optional().describe('Whether payments can be made to this account'),
    show_in_expense_claims: z.boolean().optional().describe('Whether to show in expense claims')
});

// Output schema matching Xero account response
const OutputSchema = z.object({
    account_id: z.string(),
    code: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.union([z.string(), z.null()]),
    tax_type: z.union([z.string(), z.null()]),
    enable_payments_to_account: z.boolean(),
    show_in_expense_claims: z.boolean(),
    status: z.string()
});

// Connection schema for tenant resolution
const ConnectionSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    tenantName: z.string().optional()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(ConnectionSchema)
});

// Account response schema
const AccountResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Accounts: z
        .array(
            z.object({
                AccountID: z.string(),
                Code: z.string(),
                Name: z.string(),
                Type: z.string(),
                Description: z.union([z.string(), z.null()]).optional(),
                TaxType: z.union([z.string(), z.null()]).optional(),
                EnablePaymentsToAccount: z.boolean().optional(),
                ShowInExpenseClaims: z.boolean().optional(),
                Status: z.string().optional()
            })
        )
        .optional()
});

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

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve tenant ID from connection_config, metadata, or connections API
        let tenantId: string | undefined;

        const connection = await nango.getConnection();

        // 1. Check connection_config['tenant_id']
        if (connection.connection_config) {
            const configValue = connection.connection_config['tenant_id'];
            if (typeof configValue === 'string' && configValue) {
                tenantId = configValue;
            }
        }

        // 2. Check metadata['tenantId']
        if (!tenantId && connection.metadata) {
            const metadataValue = connection.metadata['tenantId'];
            if (typeof metadataValue === 'string' && metadataValue) {
                tenantId = metadataValue;
            }
        }

        // 3. Call GET connections API
        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse connections response'
                });
            }

            const connections = parsedConnections.data.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection'
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
                    message: 'Could not get first connection'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'Could not resolve Xero tenant ID'
            });
        }

        const accountPayload = {
            Accounts: [
                {
                    Code: input.code,
                    Name: input.name,
                    Type: input.type,
                    ...(input.description && { Description: input.description }),
                    ...(input.tax_type && { TaxType: input.tax_type }),
                    ...(input.enable_payments_to_account !== undefined && {
                        EnablePaymentsToAccount: input.enable_payments_to_account
                    }),
                    ...(input.show_in_expense_claims !== undefined && {
                        ShowInExpenseClaims: input.show_in_expense_claims
                    })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Accounts',
            data: accountPayload,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedResponse = AccountResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse account creation response',
                details: parsedResponse.error.message
            });
        }

        const accounts = parsedResponse.data.Accounts;

        if (!accounts || accounts.length === 0) {
            throw new nango.ActionError({
                type: 'no_account_created',
                message: 'No account was created'
            });
        }

        const createdAccount = accounts[0];
        if (!createdAccount) {
            throw new nango.ActionError({
                type: 'no_account_created',
                message: 'No account was created'
            });
        }

        if (!createdAccount.AccountID) {
            throw new nango.ActionError({
                type: 'missing_account_id',
                message: 'Created account is missing AccountID'
            });
        }

        return {
            account_id: createdAccount.AccountID,
            code: createdAccount.Code,
            name: createdAccount.Name,
            type: createdAccount.Type,
            description: createdAccount.Description ?? null,
            tax_type: createdAccount.TaxType ?? null,
            enable_payments_to_account: createdAccount.EnablePaymentsToAccount ?? false,
            show_in_expense_claims: createdAccount.ShowInExpenseClaims ?? false,
            status: createdAccount.Status ?? 'ACTIVE'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
