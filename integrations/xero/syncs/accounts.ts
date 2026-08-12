import { createSync } from 'nango';
import { z } from 'zod';

const AccountProviderSchema = z.object({
    AccountID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Type: z.string().optional(),
    BankAccountType: z.string().optional(),
    Status: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional(),
    Class: z.string().optional(),
    SystemAccount: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    CurrencyCode: z.string().optional(),
    ReportingCode: z.string().optional(),
    ReportingCodeName: z.string().optional(),
    HasAttachments: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional()
});

const AccountSchema = z
    .object({
        id: z.string().describe('Unique Xero identifier for the account'),
        code: z.string().optional().describe('Customer-defined alphanumeric account code'),
        name: z.string().optional().describe('Display name of the account'),
        type: z.string().optional().describe('Account type, e.g. BANK, REVENUE, EXPENSE'),
        bankAccountType: z.string().optional().describe('Bank account subtype when Type is BANK, e.g. CHECKING, SAVINGS'),
        status: z.string().optional().describe('Account status: ACTIVE or ARCHIVED'),
        description: z.string().optional().describe('Human-readable description of the account'),
        taxType: z.string().optional().describe('Default tax type applied to this account'),
        enablePaymentsToAccount: z.boolean().optional().describe('Whether payments can be recorded against this account'),
        showInExpenseClaims: z.boolean().optional().describe('Whether the account appears in expense claim options'),
        class: z.string().optional().describe('High-level classification, e.g. ASSET, LIABILITY, EQUITY'),
        systemAccount: z.string().optional().describe('System-managed account indicator, e.g. DEBTORS, CREDITORS'),
        bankAccountNumber: z.string().optional().describe('Bank account number when Type is BANK'),
        currencyCode: z.string().optional().describe('Currency code for the account, e.g. USD, GBP'),
        reportingCode: z.string().optional().describe('Reporting code used for grouping in reports'),
        reportingCodeName: z.string().optional().describe('Human-readable name of the reporting code'),
        hasAttachments: z.boolean().optional().describe('Whether the account has file attachments'),
        updatedDateUTC: z.string().optional().describe('Last modification timestamp in UTC')
    })
    .describe('Xero chart of accounts entry');

const CheckpointSchema = z.object({
    updated_after: z.string().describe('ISO timestamp of the last synced UpdatedDateUTC; empty string means no prior checkpoint')
});

const sync = createSync({
    description: 'Sync accounts from the Xero chart of accounts',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);

        const isFullRefresh = !checkpoint || checkpoint.updated_after.length === 0;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Account');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = xeroDateToHttpDate(checkpoint.updated_after);
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Accounts',
            headers,
            retries: 3
        });

        const parsedPage = z.object({ Accounts: z.array(AccountProviderSchema).optional() }).safeParse(response.data);
        if (!parsedPage.success) {
            throw new Error(`Failed to parse accounts response: ${parsedPage.error.message}`);
        }

        const accounts = parsedPage.data.Accounts ?? [];

        if (accounts.length > 0) {
            const mappedAccounts = accounts.map((account) => ({
                id: account.AccountID,
                ...(account.Code != null && { code: account.Code }),
                ...(account.Name != null && { name: account.Name }),
                ...(account.Type != null && { type: account.Type }),
                ...(account.BankAccountType != null && { bankAccountType: account.BankAccountType }),
                ...(account.Status != null && { status: account.Status }),
                ...(account.Description != null && { description: account.Description }),
                ...(account.TaxType != null && { taxType: account.TaxType }),
                ...(account.EnablePaymentsToAccount != null && { enablePaymentsToAccount: account.EnablePaymentsToAccount }),
                ...(account.ShowInExpenseClaims != null && { showInExpenseClaims: account.ShowInExpenseClaims }),
                ...(account.Class != null && { class: account.Class }),
                ...(account.SystemAccount != null && { systemAccount: account.SystemAccount }),
                ...(account.BankAccountNumber != null && { bankAccountNumber: account.BankAccountNumber }),
                ...(account.CurrencyCode != null && { currencyCode: account.CurrencyCode }),
                ...(account.ReportingCode != null && { reportingCode: account.ReportingCode }),
                ...(account.ReportingCodeName != null && { reportingCodeName: account.ReportingCodeName }),
                ...(account.HasAttachments != null && { hasAttachments: account.HasAttachments }),
                ...(account.UpdatedDateUTC != null && { updatedDateUTC: account.UpdatedDateUTC })
            }));

            await nango.batchSave(mappedAccounts, 'Account');

            let latestUpdatedDate: Date | null = null;
            let latestUpdatedDateUTC = '';
            for (const account of accounts) {
                if (!account.UpdatedDateUTC) {
                    continue;
                }
                const parsedDate = parseXeroDate(account.UpdatedDateUTC);
                if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedDate;
                    latestUpdatedDateUTC = account.UpdatedDateUTC;
                }
            }

            if (latestUpdatedDateUTC.length > 0) {
                await nango.saveCheckpoint({ updated_after: latestUpdatedDateUTC });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Account');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function parseXeroDate(value: string): Date | null {
    // Allow negative timestamps for pre-1970 Xero dates (see general-ledger.ts parseDate).
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function xeroDateToHttpDate(xeroDate: string): string {
    const parsed = parseXeroDate(xeroDate);
    if (parsed) {
        return parsed.toUTCString();
    }

    throw new Error(`Invalid Xero date format: ${xeroDate}`);
}

async function resolveTenantId(nango: NangoSyncLocal): Promise<string> {
    const connection = await nango.getConnection();

    if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
        const tenantId = connection.connection_config['tenant_id'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    if (connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
        const tenantId = connection.metadata['tenantId'];
        if (typeof tenantId === 'string' && tenantId.length > 0) {
            return tenantId;
        }
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsed = z.array(z.record(z.string(), z.unknown())).safeParse(response.data);
    if (!parsed.success || parsed.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    const connections = parsed.data;

    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = connections[0];
    const tenantId = firstConnection ? firstConnection['tenantId'] : undefined;
    if (typeof tenantId === 'string' && tenantId.length > 0) {
        return tenantId;
    }

    throw new Error('Unable to resolve xero-tenant-id.');
}
