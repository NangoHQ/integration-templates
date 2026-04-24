import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_id: z.string().describe('Xero Account ID. Example: "00000000-0000-0000-0000-000000000000"'),
    code: z.string().optional().describe('Customer defined alpha numeric account code'),
    name: z.string().optional().describe('Name of account'),
    type: z.string().optional().describe('Account type'),
    bank_account_number: z.string().optional().describe('Bank account number'),
    status: z.string().optional().describe('Account status: ACTIVE or ARCHIVED'),
    description: z.string().optional().describe('Description of the account'),
    tax_type: z.string().optional().describe('Tax type'),
    enable_payments_to_account: z.boolean().optional().describe('Boolean to indicate if payments can be made to this account'),
    show_in_expense_claims: z.boolean().optional().describe('Boolean to indicate if the account is available for use in expense claims'),
    class: z.string().optional().describe('Accounts class'),
    reporting_code: z.string().optional().describe('Reporting code'),
    reporting_code_name: z.string().optional().describe('Reporting code name'),
    system_account: z.string().optional().describe('System account type'),
    has_attachments: z.boolean().optional().describe('Boolean to indicate if the account has attachments')
});

const ProviderAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Type: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    Status: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional(),
    Class: z.string().optional(),
    ReportingCode: z.string().optional(),
    ReportingCodeName: z.string().optional(),
    SystemAccount: z.string().nullable().optional(),
    HasAttachments: z.boolean().optional()
});

const OutputSchema = z.object({
    account_id: z.string(),
    code: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    bank_account_number: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    tax_type: z.string().optional(),
    enable_payments_to_account: z.boolean().optional(),
    show_in_expense_claims: z.boolean().optional(),
    class: z.string().optional(),
    reporting_code: z.string().optional(),
    reporting_code_name: z.string().optional(),
    system_account: z.string().nullable().optional(),
    has_attachments: z.boolean().optional()
});

const action = createAction({
    description: 'Update an existing account.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionData = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).optional(),
                metadata: z.record(z.string(), z.unknown()).optional()
            })
            .parse(connection);

        let tenantId: string | undefined;

        if (connectionData.connection_config && typeof connectionData.connection_config['tenant_id'] === 'string') {
            tenantId = connectionData.connection_config['tenant_id'];
        }

        if (!tenantId && connectionData.metadata && typeof connectionData.metadata['tenantId'] === 'string') {
            tenantId = connectionData.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overviewconnections
            const connectionsResponse = await nango.proxy({
                method: 'GET',
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z
                .object({
                    tenantId: z.string()
                })
                .parse(connections[0]);

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const accountPayload: Record<string, unknown> = {
            AccountID: input.account_id
        };

        if (input.code !== undefined) {
            accountPayload['Code'] = input.code;
        }
        if (input.name !== undefined) {
            accountPayload['Name'] = input.name;
        }
        if (input.type !== undefined) {
            accountPayload['Type'] = input.type;
        }
        if (input.bank_account_number !== undefined) {
            accountPayload['BankAccountNumber'] = input.bank_account_number;
        }
        if (input.status !== undefined) {
            accountPayload['Status'] = input.status;
        }
        if (input.description !== undefined) {
            accountPayload['Description'] = input.description;
        }
        if (input.tax_type !== undefined) {
            accountPayload['TaxType'] = input.tax_type;
        }
        if (input.enable_payments_to_account !== undefined) {
            accountPayload['EnablePaymentsToAccount'] = input.enable_payments_to_account;
        }
        if (input.show_in_expense_claims !== undefined) {
            accountPayload['ShowInExpenseClaims'] = input.show_in_expense_claims;
        }
        if (input.class !== undefined) {
            accountPayload['Class'] = input.class;
        }
        if (input.reporting_code !== undefined) {
            accountPayload['ReportingCode'] = input.reporting_code;
        }
        if (input.reporting_code_name !== undefined) {
            accountPayload['ReportingCodeName'] = input.reporting_code_name;
        }
        if (input.system_account !== undefined) {
            accountPayload['SystemAccount'] = input.system_account;
        }
        if (input.has_attachments !== undefined) {
            accountPayload['HasAttachments'] = input.has_attachments;
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.proxy({
            method: 'POST',
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Accounts: [accountPayload]
            },
            retries: 3
        });

        const responseSchema = z.object({
            Accounts: z.array(z.record(z.string(), z.unknown())).optional(),
            Status: z.string().optional(),
            Type: z.string().optional(),
            Message: z.string().optional(),
            Elements: z.array(z.record(z.string(), z.unknown())).optional()
        });

        const parsedResponse = responseSchema.parse(response.data);

        if (parsedResponse.Status && parsedResponse.Status !== 'OK') {
            throw new nango.ActionError({
                type: 'xero_api_error',
                message: parsedResponse.Message || 'Xero API returned an error.',
                status: parsedResponse.Status,
                details: parsedResponse.Elements || []
            });
        }

        if (!parsedResponse.Accounts || parsedResponse.Accounts.length === 0) {
            throw new nango.ActionError({
                type: 'no_accounts',
                message: 'No accounts returned from Xero after update.'
            });
        }

        const updatedAccount = ProviderAccountSchema.parse(parsedResponse.Accounts[0]);

        return {
            account_id: updatedAccount.AccountID,
            ...(updatedAccount.Code !== undefined && { code: updatedAccount.Code }),
            ...(updatedAccount.Name !== undefined && { name: updatedAccount.Name }),
            ...(updatedAccount.Type !== undefined && { type: updatedAccount.Type }),
            ...(updatedAccount.BankAccountNumber !== undefined && { bank_account_number: updatedAccount.BankAccountNumber }),
            ...(updatedAccount.Status !== undefined && { status: updatedAccount.Status }),
            ...(updatedAccount.Description !== undefined && { description: updatedAccount.Description }),
            ...(updatedAccount.TaxType !== undefined && { tax_type: updatedAccount.TaxType }),
            ...(updatedAccount.EnablePaymentsToAccount !== undefined && { enable_payments_to_account: updatedAccount.EnablePaymentsToAccount }),
            ...(updatedAccount.ShowInExpenseClaims !== undefined && { show_in_expense_claims: updatedAccount.ShowInExpenseClaims }),
            ...(updatedAccount.Class !== undefined && { class: updatedAccount.Class }),
            ...(updatedAccount.ReportingCode !== undefined && { reporting_code: updatedAccount.ReportingCode }),
            ...(updatedAccount.ReportingCodeName !== undefined && { reporting_code_name: updatedAccount.ReportingCodeName }),
            ...(updatedAccount.SystemAccount !== undefined && { system_account: updatedAccount.SystemAccount }),
            ...(updatedAccount.HasAttachments !== undefined && { has_attachments: updatedAccount.HasAttachments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
