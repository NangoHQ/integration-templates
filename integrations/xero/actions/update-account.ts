import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        AccountID: z.string().describe('Unique Xero identifier for the account. Example: "ceef66a5-a545-413b-9312-78a53caadbc4"'),
        Code: z.string().optional().describe('Account code (account number).'),
        Name: z.string().optional().describe('Name of the account.'),
        Type: z.string().optional().describe('Account type. Example: "BANK", "EXPENSE", "REVENUE".'),
        BankAccountNumber: z.string().optional().describe('Bank account number (for bank accounts).'),
        Status: z.string().optional().describe('Status of the account. Valid values: "ACTIVE", "ARCHIVED".'),
        Description: z.string().optional().describe('Description of the account.'),
        TaxType: z.string().optional().describe('Default tax type for the account.'),
        BankAccountType: z.string().optional().describe('Bank account type. Example: "BANK", "CHECKING".'),
        EnablePaymentsToAccount: z.boolean().optional().describe('Whether payments can be made to this account.'),
        ShowInExpenseClaims: z.boolean().optional().describe('Whether the account is available for expense claims.'),
        ReportingCode: z.string().optional().describe('Reporting code for the account.'),
        ReportingCodeName: z.string().optional().describe('Name of the reporting code.'),
        SystemAccount: z.string().optional().describe('System account type if applicable.'),
        CurrencyCode: z.string().optional().describe('Currency code for the account.')
    })
    .describe('Input for updating an existing Xero account.');

const ProviderAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string().nullish(),
    Name: z.string().nullish(),
    Type: z.string().nullish(),
    BankAccountNumber: z.string().nullish(),
    Status: z.string().nullish(),
    Description: z.string().nullish(),
    TaxType: z.string().nullish(),
    BankAccountType: z.string().nullish(),
    Class: z.string().nullish(),
    EnablePaymentsToAccount: z.boolean().nullish(),
    ShowInExpenseClaims: z.boolean().nullish(),
    ReportingCode: z.string().nullish(),
    ReportingCodeName: z.string().nullish(),
    SystemAccount: z.string().nullish(),
    CurrencyCode: z.string().nullish()
});

const OutputSchema = z
    .object({
        AccountID: z.string().describe('Unique Xero identifier for the account.'),
        Code: z.string().optional().describe('Account code (account number).'),
        Name: z.string().optional().describe('Name of the account.'),
        Type: z.string().optional().describe('Account type.'),
        BankAccountNumber: z.string().optional().describe('Bank account number.'),
        Status: z.string().optional().describe('Status of the account.'),
        Description: z.string().optional().describe('Description of the account.'),
        TaxType: z.string().optional().describe('Default tax type for the account.'),
        BankAccountType: z.string().optional().describe('Bank account type.'),
        Class: z.string().optional().describe('Account classification.'),
        EnablePaymentsToAccount: z.boolean().optional().describe('Whether payments can be made to this account.'),
        ShowInExpenseClaims: z.boolean().optional().describe('Whether the account is available for expense claims.'),
        ReportingCode: z.string().optional().describe('Reporting code for the account.'),
        ReportingCodeName: z.string().optional().describe('Name of the reporting code.'),
        SystemAccount: z.string().optional().describe('System account type if applicable.'),
        CurrencyCode: z.string().optional().describe('Currency code for the account.')
    })
    .describe('Updated Xero account.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing account record in Xero via POST.
 * @pitfalls: BankAccountType values may be silently normalized by Xero (e.g. "CHECKING" returned as "BANK"), and accounts can be hard-deleted so previously valid IDs may no longer exist.
 */
const action = createAction({
    description: 'Update an existing account.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResponse = await nango.getConnection();

        const ConnectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).nullish(),
            metadata: z.record(z.string(), z.unknown()).nullish()
        });

        const connection = ConnectionSchema.parse(connectionResponse);
        const connectionConfig = connection['connection_config'];
        const connectionMetadata = connection['metadata'];

        let tenantId: string | undefined;

        if (typeof connectionConfig?.['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId && typeof connectionMetadata?.['tenantId'] === 'string' && connectionMetadata['tenantId'].length > 0) {
            tenantId = connectionMetadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.object({ tenantId: z.string().optional() }).safeParse(rawConnections[0]);
            if (firstConnection.success && typeof firstConnection.data.tenantId === 'string' && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const accountPayload: Record<string, unknown> = {
            AccountID: input.AccountID
        };

        if (input['Code'] !== undefined) {
            accountPayload['Code'] = input['Code'];
        }
        if (input['Name'] !== undefined) {
            accountPayload['Name'] = input['Name'];
        }
        if (input['Type'] !== undefined) {
            accountPayload['Type'] = input['Type'];
        }
        if (input['BankAccountNumber'] !== undefined) {
            accountPayload['BankAccountNumber'] = input['BankAccountNumber'];
        }
        if (input['Status'] !== undefined) {
            accountPayload['Status'] = input['Status'];
        }
        if (input['Description'] !== undefined) {
            accountPayload['Description'] = input['Description'];
        }
        if (input['TaxType'] !== undefined) {
            accountPayload['TaxType'] = input['TaxType'];
        }
        if (input['BankAccountType'] !== undefined) {
            accountPayload['BankAccountType'] = input['BankAccountType'];
        }
        if (input['EnablePaymentsToAccount'] !== undefined) {
            accountPayload['EnablePaymentsToAccount'] = input['EnablePaymentsToAccount'];
        }
        if (input['ShowInExpenseClaims'] !== undefined) {
            accountPayload['ShowInExpenseClaims'] = input['ShowInExpenseClaims'];
        }
        if (input['ReportingCode'] !== undefined) {
            accountPayload['ReportingCode'] = input['ReportingCode'];
        }
        if (input['ReportingCodeName'] !== undefined) {
            accountPayload['ReportingCodeName'] = input['ReportingCodeName'];
        }
        if (input['SystemAccount'] !== undefined) {
            accountPayload['SystemAccount'] = input['SystemAccount'];
        }
        if (input['CurrencyCode'] !== undefined) {
            accountPayload['CurrencyCode'] = input['CurrencyCode'];
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Accounts: [accountPayload]
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            Accounts: z.array(ProviderAccountSchema).optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const account = providerResponse.Accounts?.[0];

        if (!account) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Account update failed or returned no account data.'
            });
        }

        return {
            AccountID: account.AccountID,
            ...(account['Code'] != null && { Code: account['Code'] }),
            ...(account['Name'] != null && { Name: account['Name'] }),
            ...(account['Type'] != null && { Type: account['Type'] }),
            ...(account['BankAccountNumber'] != null && { BankAccountNumber: account['BankAccountNumber'] }),
            ...(account['Status'] != null && { Status: account['Status'] }),
            ...(account['Description'] != null && { Description: account['Description'] }),
            ...(account['TaxType'] != null && { TaxType: account['TaxType'] }),
            ...(account['BankAccountType'] != null && { BankAccountType: account['BankAccountType'] }),
            ...(account['Class'] != null && { Class: account['Class'] }),
            ...(account['EnablePaymentsToAccount'] != null && { EnablePaymentsToAccount: account['EnablePaymentsToAccount'] }),
            ...(account['ShowInExpenseClaims'] != null && { ShowInExpenseClaims: account['ShowInExpenseClaims'] }),
            ...(account['ReportingCode'] != null && { ReportingCode: account['ReportingCode'] }),
            ...(account['ReportingCodeName'] != null && { ReportingCodeName: account['ReportingCodeName'] }),
            ...(account['SystemAccount'] != null && { SystemAccount: account['SystemAccount'] }),
            ...(account['CurrencyCode'] != null && { CurrencyCode: account['CurrencyCode'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
