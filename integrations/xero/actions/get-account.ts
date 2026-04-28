import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Xero Account ID. Example: "297c2dc5-cc47-4afd-8ec8-74990b8761e5"')
});

const ProviderAccountSchema = z
    .object({
        AccountID: z.string(),
        Code: z.string().optional(),
        Name: z.string().optional(),
        Type: z.string().optional(),
        BankAccountNumber: z.string().optional(),
        Status: z.string().optional(),
        Description: z.string().optional(),
        BankAccountType: z.string().optional(),
        CurrencyCode: z.string().optional(),
        TaxType: z.string().optional(),
        EnablePaymentsToAccount: z.boolean().optional(),
        ShowInExpenseClaims: z.boolean().optional(),
        Class: z.string().optional(),
        SystemAccount: z.string().optional().nullable(),
        ReportingCode: z.string().optional(),
        ReportingCodeName: z.string().optional(),
        HasAttachments: z.boolean().optional(),
        UpdatedDateUTC: z.string().optional(),
        AddToWatchlist: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    AccountID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Type: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Status: z.string().optional(),
    Description: z.string().optional(),
    BankAccountType: z.string().optional(),
    CurrencyCode: z.string().optional(),
    TaxType: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional(),
    Class: z.string().optional(),
    SystemAccount: z.string().optional(),
    ReportingCode: z.string().optional(),
    ReportingCodeName: z.string().optional(),
    HasAttachments: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    AddToWatchlist: z.boolean().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ConnectionsApiSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

const AccountsApiResponseSchema = z.object({
    Accounts: z.array(z.unknown())
});

const action = createAction({
    description: 'Retrieve an account by AccountID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawConnection = await nango.getConnection();
        const connection = ConnectionSchema.parse(rawConnection);

        const configValue = connection.connection_config?.['tenant_id'];
        const metaValue = connection.metadata?.['tenantId'];
        let tenantId: string | undefined;
        if (typeof configValue === 'string' && configValue.length > 0) {
            tenantId = configValue;
        } else if (typeof metaValue === 'string' && metaValue.length > 0) {
            tenantId = metaValue;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = ConnectionsApiSchema.parse(connectionsResponse.data);
            const [firstConnection, secondConnection] = connectionsData;
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No tenants found for this connection.'
                });
            }
            if (secondConnection) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: `api.xro/2.0/Accounts/${input.accountId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const responseData = AccountsApiResponseSchema.parse(response.data);
        if (responseData.Accounts.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Account not found for ID: ${input.accountId}`
            });
        }

        const rawAccount = responseData.Accounts[0];
        if (!rawAccount || typeof rawAccount !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid account data in response.'
            });
        }

        const providerAccount = ProviderAccountSchema.parse(rawAccount);

        return {
            AccountID: providerAccount.AccountID,
            ...(providerAccount.Code !== undefined && { Code: providerAccount.Code }),
            ...(providerAccount.Name !== undefined && { Name: providerAccount.Name }),
            ...(providerAccount.Type !== undefined && { Type: providerAccount.Type }),
            ...(providerAccount.BankAccountNumber !== undefined && { BankAccountNumber: providerAccount.BankAccountNumber }),
            ...(providerAccount.Status !== undefined && { Status: providerAccount.Status }),
            ...(providerAccount.Description !== undefined && { Description: providerAccount.Description }),
            ...(providerAccount.BankAccountType !== undefined && { BankAccountType: providerAccount.BankAccountType }),
            ...(providerAccount.CurrencyCode !== undefined && { CurrencyCode: providerAccount.CurrencyCode }),
            ...(providerAccount.TaxType !== undefined && { TaxType: providerAccount.TaxType }),
            ...(providerAccount.EnablePaymentsToAccount !== undefined && { EnablePaymentsToAccount: providerAccount.EnablePaymentsToAccount }),
            ...(providerAccount.ShowInExpenseClaims !== undefined && { ShowInExpenseClaims: providerAccount.ShowInExpenseClaims }),
            ...(providerAccount.Class !== undefined && { Class: providerAccount.Class }),
            ...(providerAccount.SystemAccount != null && { SystemAccount: providerAccount.SystemAccount }),
            ...(providerAccount.ReportingCode !== undefined && { ReportingCode: providerAccount.ReportingCode }),
            ...(providerAccount.ReportingCodeName !== undefined && { ReportingCodeName: providerAccount.ReportingCodeName }),
            ...(providerAccount.HasAttachments !== undefined && { HasAttachments: providerAccount.HasAttachments }),
            ...(providerAccount.UpdatedDateUTC !== undefined && { UpdatedDateUTC: providerAccount.UpdatedDateUTC }),
            ...(providerAccount.AddToWatchlist !== undefined && { AddToWatchlist: providerAccount.AddToWatchlist })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
