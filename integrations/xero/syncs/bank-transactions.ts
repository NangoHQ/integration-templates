import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const BankTransactionSchema = z
    .object({
        id: z.string().describe('Xero generated unique identifier for the bank transaction'),
        Type: z.string().optional().describe('Type of bank transaction such as RECEIVE, SPEND, RECEIVE-OVERPAYMENT, SPEND-OVERPAYMENT, etc.'),
        Status: z.string().optional().describe('Status of the bank transaction such as AUTHORISED, DELETED, or VOIDED'),
        ContactID: z.string().optional().describe('Unique identifier of the associated contact'),
        ContactName: z.string().optional().describe('Name of the associated contact'),
        BankAccountID: z.string().optional().describe('Unique identifier of the bank account'),
        BankAccountCode: z.string().optional().describe('Code of the bank account'),
        BankAccountName: z.string().optional().describe('Name of the bank account'),
        Date: z.string().optional().describe('Date of the transaction'),
        Reference: z.string().optional().describe('Reference for the transaction'),
        CurrencyCode: z.string().optional().describe('Currency code of the transaction'),
        CurrencyRate: z.number().optional().describe('Exchange rate to base currency when money is spent or received'),
        Url: z.string().optional().describe('URL link to a source document'),
        LineAmountTypes: z.string().optional().describe('Line amount types for the transaction'),
        SubTotal: z.number().optional().describe('Total of bank transaction excluding taxes'),
        TotalTax: z.number().optional().describe('Total tax on bank transaction'),
        Total: z.number().optional().describe('Total of bank transaction tax inclusive'),
        IsReconciled: z.boolean().optional().describe('Boolean to show if transaction is reconciled'),
        PrepaymentID: z.string().optional().describe('Unique identifier for a prepayment'),
        OverpaymentID: z.string().optional().describe('Unique identifier for an overpayment'),
        UpdatedDateUTC: z.string().describe('Last modified date in UTC format'),
        HasAttachments: z.boolean().optional().describe('Boolean to indicate if a bank transaction has an attachment'),
        StatusAttributeString: z.string().optional().describe('A string to indicate the invoice status')
    })
    .describe('A bank transaction from Xero');

const ProviderBankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: z
        .object({
            ContactID: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    BankAccount: z
        .object({
            AccountID: z.string().optional(),
            Code: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    Date: z.string().optional(),
    Reference: z.string().optional().nullable(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional().nullable(),
    Url: z.string().optional().nullable(),
    LineAmountTypes: z.string().optional(),
    SubTotal: z.number().optional().nullable(),
    TotalTax: z.number().optional().nullable(),
    Total: z.number().optional().nullable(),
    IsReconciled: z.boolean().optional(),
    PrepaymentID: z.string().optional().nullable(),
    OverpaymentID: z.string().optional().nullable(),
    UpdatedDateUTC: z.string(),
    HasAttachments: z.boolean().optional(),
    StatusAttributeString: z.string().optional().nullable()
});

type BankTransaction = z.infer<typeof BankTransactionSchema>;

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

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

const sync = createSync({
    description: 'Sync bank transactions from Xero.',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BankTransaction: BankTransactionSchema
    },

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const validCheckpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (validCheckpoint && validCheckpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = validCheckpoint.updated_after;
        }

        const params: Record<string, string> = {};
        if (validCheckpoint && validCheckpoint.updated_after.length > 0) {
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/overview
            endpoint: 'api.xro/2.0/BankTransactions',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit: 100,
                response_path: 'BankTransactions'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const records = z.array(ProviderBankTransactionSchema).safeParse(page);
            if (!records.success) {
                throw new Error(`Failed to parse bank transactions page: ${records.error.message}`);
            }

            const mapped = records.data.map(
                (record): BankTransaction => ({
                    id: record.BankTransactionID,
                    ...(record.Type && { Type: record.Type }),
                    ...(record.Status && { Status: record.Status }),
                    ...(record.Contact?.ContactID && { ContactID: record.Contact.ContactID }),
                    ...(record.Contact?.Name && { ContactName: record.Contact.Name }),
                    ...(record.BankAccount?.AccountID && { BankAccountID: record.BankAccount.AccountID }),
                    ...(record.BankAccount?.Code && { BankAccountCode: record.BankAccount.Code }),
                    ...(record.BankAccount?.Name && { BankAccountName: record.BankAccount.Name }),
                    ...(record.Date && { Date: record.Date }),
                    ...(record.Reference != null && { Reference: record.Reference }),
                    ...(record.CurrencyCode && { CurrencyCode: record.CurrencyCode }),
                    ...(record.CurrencyRate != null && { CurrencyRate: record.CurrencyRate }),
                    ...(record.Url != null && { Url: record.Url }),
                    ...(record.LineAmountTypes && { LineAmountTypes: record.LineAmountTypes }),
                    ...(record.SubTotal != null && { SubTotal: record.SubTotal }),
                    ...(record.TotalTax != null && { TotalTax: record.TotalTax }),
                    ...(record.Total != null && { Total: record.Total }),
                    ...(record.IsReconciled != null && { IsReconciled: record.IsReconciled }),
                    ...(record.PrepaymentID != null && { PrepaymentID: record.PrepaymentID }),
                    ...(record.OverpaymentID != null && { OverpaymentID: record.OverpaymentID }),
                    UpdatedDateUTC: record.UpdatedDateUTC,
                    ...(record.HasAttachments != null && { HasAttachments: record.HasAttachments }),
                    ...(record.StatusAttributeString != null && { StatusAttributeString: record.StatusAttributeString })
                })
            );

            const activeRecords = mapped.filter((record) => record.Status !== 'DELETED');
            const deletedRecords = mapped.filter((record) => record.Status === 'DELETED');

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'BankTransaction');
            }

            if (validCheckpoint && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'BankTransaction');
            }

            if (mapped.length > 0) {
                let latestUpdatedDate: Date | null = null;
                for (const record of mapped) {
                    const parsedDate = parseXeroDate(record.UpdatedDateUTC);
                    if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                        latestUpdatedDate = parsedDate;
                    }
                }

                if (latestUpdatedDate) {
                    await nango.saveCheckpoint({
                        updated_after: formatIfModifiedSince(latestUpdatedDate)
                    });
                }
            }
        }
    }
});

async function resolveTenantId(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfigSchema = z.object({
        tenant_id: z.string().optional()
    });
    const connectionConfig = connectionConfigSchema.safeParse(connection.connection_config);
    if (connectionConfig.success && connectionConfig.data.tenant_id) {
        return connectionConfig.data.tenant_id;
    }

    const metadataSchema = z.object({
        tenantId: z.string().optional()
    });
    const metadata = metadataSchema.safeParse(connection.metadata);
    if (metadata.success && metadata.data.tenantId) {
        return metadata.data.tenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const ConnectionsSchema = z.array(
        z.object({
            tenantId: z.string().optional()
        })
    );

    const parsedConnections = ConnectionsSchema.safeParse(connectionsResponse.data);
    if (!parsedConnections.success || parsedConnections.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    const connections = parsedConnections.data;
    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const connection0 = connections[0];
    if (connection0 && typeof connection0.tenantId === 'string' && connection0.tenantId.length > 0) {
        return connection0.tenantId;
    }

    throw new Error('Unable to resolve xero-tenant-id.');
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
