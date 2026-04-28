import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string().describe('Xero AccountID'),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    BankAccountNumber: z.string().optional(),
    BankAccountType: z.string().optional(),
    CurrencyCode: z.string().optional(),
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

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const XeroAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string().optional().nullable(),
    Name: z.string().optional().nullable(),
    Type: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    TaxType: z.string().optional().nullable(),
    BankAccountNumber: z.string().optional().nullable(),
    BankAccountType: z.string().optional().nullable(),
    CurrencyCode: z.string().optional().nullable(),
    EnablePaymentsToAccount: z.boolean().optional().nullable(),
    ShowInExpenseClaims: z.boolean().optional().nullable(),
    Class: z.string().optional().nullable(),
    SystemAccount: z.string().optional().nullable(),
    ReportingCode: z.string().optional().nullable(),
    ReportingCodeName: z.string().optional().nullable(),
    HasAttachments: z.boolean().optional().nullable(),
    UpdatedDateUTC: z.string().optional().nullable(),
    AddToWatchlist: z.boolean().optional().nullable()
});

function parseMsJsonDate(dateString: string): Date | null {
    const match = dateString.match(/\/Date\((\d+)([+-]\d{4})\)\//);
    if (!match) {
        return null;
    }
    const timestamp = match[1];
    if (!timestamp) {
        return null;
    }
    return new Date(parseInt(timestamp, 10));
}

function mapAccount(record: z.infer<typeof XeroAccountSchema>): z.infer<typeof AccountSchema> {
    return {
        id: record.AccountID,
        ...(record.Code != null && { Code: record.Code }),
        ...(record.Name != null && { Name: record.Name }),
        ...(record.Type != null && { Type: record.Type }),
        ...(record.Status != null && { Status: record.Status }),
        ...(record.Description != null && { Description: record.Description }),
        ...(record.TaxType != null && { TaxType: record.TaxType }),
        ...(record.BankAccountNumber != null && { BankAccountNumber: record.BankAccountNumber }),
        ...(record.BankAccountType != null && { BankAccountType: record.BankAccountType }),
        ...(record.CurrencyCode != null && { CurrencyCode: record.CurrencyCode }),
        ...(record.EnablePaymentsToAccount != null && { EnablePaymentsToAccount: record.EnablePaymentsToAccount }),
        ...(record.ShowInExpenseClaims != null && { ShowInExpenseClaims: record.ShowInExpenseClaims }),
        ...(record.Class != null && { Class: record.Class }),
        ...(record.SystemAccount != null && { SystemAccount: record.SystemAccount }),
        ...(record.ReportingCode != null && { ReportingCode: record.ReportingCode }),
        ...(record.ReportingCodeName != null && { ReportingCodeName: record.ReportingCodeName }),
        ...(record.HasAttachments != null && { HasAttachments: record.HasAttachments }),
        ...(record.UpdatedDateUTC != null && { UpdatedDateUTC: record.UpdatedDateUTC }),
        ...(record.AddToWatchlist != null && { AddToWatchlist: record.AddToWatchlist })
    };
}

const sync = createSync({
    description: 'Sync accounts from the Xero chart of accounts.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/accounts' }],
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
            const value = connectionConfig['tenant_id'];
            if (typeof value === 'string') {
                tenantId = value;
            }
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
                const value = metadata['tenantId'];
                if (typeof value === 'string') {
                    tenantId = value;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = z
                .array(
                    z.object({
                        tenantId: z.string()
                    })
                )
                .safeParse(connectionsResponse.data);

            if (!connectionsData.success) {
                throw new Error('Invalid connections response');
            }

            if (connectionsData.data.length === 0) {
                throw new Error('No tenants found');
            }

            if (connectionsData.data.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = connectionsData.data[0];
            if (!firstConnection) {
                throw new Error('Invalid connections response');
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new Error('Could not resolve xero-tenant-id');
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {};

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Accounts',
            headers,
            params,
            retries: 3
        });

        const accountsRaw = z.object({ Accounts: z.array(XeroAccountSchema).optional() }).safeParse(response.data).data?.Accounts ?? [];

        const mapped = accountsRaw.map(mapAccount);

        const active = mapped.filter((a) => a.Status === 'ACTIVE');
        if (active.length > 0) {
            await nango.batchSave(active, 'Account');
        }

        if (checkpoint) {
            const archived = mapped.filter((a) => a.Status === 'ARCHIVED');
            if (archived.length > 0) {
                await nango.batchDelete(archived, 'Account');
            }
        }

        let latestDate: Date | null = null;
        for (const record of accountsRaw) {
            if (record.UpdatedDateUTC) {
                const d = parseMsJsonDate(record.UpdatedDateUTC);
                if (d && (!latestDate || d > latestDate)) {
                    latestDate = d;
                }
            }
        }

        if (latestDate) {
            await nango.saveCheckpoint({
                updated_after: latestDate.toUTCString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
