import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderAccountSchema = z.object({
    AccountID: z.string().nullish(),
    Code: z.string().nullish()
});

const ProviderInvoiceSchema = z.object({
    InvoiceID: z.string().nullish(),
    InvoiceNumber: z.string().nullish(),
    Type: z.string().nullish()
});

const ProviderPaymentSchema = z.object({
    PaymentID: z.string(),
    Date: z.string().nullish(),
    Amount: z.number().nullish(),
    BankAmount: z.number().nullish(),
    CurrencyRate: z.number().nullish(),
    Reference: z.string().nullish(),
    PaymentType: z.string().nullish(),
    Status: z.string(),
    UpdatedDateUTC: z.string(),
    HasAccount: z.boolean().nullish(),
    IsReconciled: z.boolean().nullish(),
    Account: ProviderAccountSchema.nullish(),
    Invoice: ProviderInvoiceSchema.nullish(),
    CreditNote: z.record(z.string(), z.unknown()).nullish(),
    Prepayment: z.record(z.string(), z.unknown()).nullish(),
    Overpayment: z.record(z.string(), z.unknown()).nullish(),
    BatchPaymentID: z.string().nullish(),
    BankAccountNumber: z.string().nullish(),
    Code: z.string().nullish(),
    InvoiceNumber: z.string().nullish(),
    CreditNoteNumber: z.string().nullish(),
    HasValidationErrors: z.boolean().nullish()
});

const AccountSchema = z
    .object({
        AccountID: z.string().optional().describe('The unique identifier of the bank account used for this payment.'),
        Code: z.string().optional().describe('The chart of accounts code for the bank account.')
    })
    .describe('A bank account reference used within a Xero payment.');

const InvoiceSchema = z
    .object({
        InvoiceID: z.string().optional().describe('The unique identifier of the invoice this payment is applied to.'),
        InvoiceNumber: z.string().optional().describe('The user-facing invoice number.'),
        Type: z.string().optional().describe('The invoice type, e.g. ACCREC or ACCPAY.')
    })
    .describe('An invoice reference within a Xero payment.');

const PaymentSchema = z
    .object({
        id: z.string().describe('The unique Xero identifier for the payment.'),
        Date: z.string().optional().describe('The date the payment was made.'),
        Amount: z.number().optional().describe('The amount of the payment.'),
        BankAmount: z.number().optional().describe('The amount of the payment in the bank account currency.'),
        CurrencyRate: z.number().optional().describe('The exchange rate applied for multi-currency payments.'),
        Reference: z.string().optional().describe('A reference or memo for the payment.'),
        PaymentType: z.string().optional().describe('The type of payment, e.g. ACCRECPAYMENT or ARCREDITPAYMENT.'),
        Status: z.string().describe('The status of the payment, e.g. AUTHORISED or DELETED.'),
        UpdatedDateUTC: z.string().describe('The last-modified timestamp in UTC used for incremental sync.'),
        HasAccount: z.boolean().optional().describe('Whether a bank account is associated with this payment.'),
        IsReconciled: z.boolean().optional().describe('Whether the payment has been reconciled in Xero.'),
        Account: AccountSchema.optional().describe('The bank account used for this payment.'),
        Invoice: InvoiceSchema.optional().describe('The invoice this payment is applied to.'),
        CreditNote: z.record(z.string(), z.unknown()).optional().describe('The credit note this payment is applied to, if any.'),
        Prepayment: z.record(z.string(), z.unknown()).optional().describe('The prepayment this payment is applied to, if any.'),
        Overpayment: z.record(z.string(), z.unknown()).optional().describe('The overpayment this payment is applied to, if any.'),
        BatchPaymentID: z.string().optional().describe('The identifier of the parent batch payment, if applicable.'),
        BankAccountNumber: z.string().optional().describe('The bank account number used for the payment.'),
        Code: z.string().optional().describe('The chart of accounts code for the payment.'),
        InvoiceNumber: z.string().optional().describe('The invoice number the payment is applied to, if known at the root level.'),
        CreditNoteNumber: z.string().optional().describe('The credit note number the payment is applied to, if known at the root level.'),
        HasValidationErrors: z.boolean().optional().describe('Whether the payment has validation errors.')
    })
    .describe('A payment record from Xero representing money received or paid against an invoice, credit note, prepayment or overpayment.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const TenantConnectionsSchema = z.array(
    z
        .object({
            tenantId: z.string()
        })
        .passthrough()
);

function mapPayment(raw: z.infer<typeof ProviderPaymentSchema>): z.infer<typeof PaymentSchema> {
    return {
        id: raw.PaymentID,
        Status: raw.Status,
        UpdatedDateUTC: raw.UpdatedDateUTC,
        ...(raw.Date != null && { Date: raw.Date }),
        ...(raw.Amount != null && { Amount: raw.Amount }),
        ...(raw.BankAmount != null && { BankAmount: raw.BankAmount }),
        ...(raw.CurrencyRate != null && { CurrencyRate: raw.CurrencyRate }),
        ...(raw.Reference != null && { Reference: raw.Reference }),
        ...(raw.PaymentType != null && { PaymentType: raw.PaymentType }),
        ...(raw.HasAccount != null && { HasAccount: raw.HasAccount }),
        ...(raw.IsReconciled != null && { IsReconciled: raw.IsReconciled }),
        ...(raw.Account != null && {
            Account: {
                ...(raw.Account.AccountID != null && { AccountID: raw.Account.AccountID }),
                ...(raw.Account.Code != null && { Code: raw.Account.Code })
            }
        }),
        ...(raw.Invoice != null && {
            Invoice: {
                ...(raw.Invoice.InvoiceID != null && { InvoiceID: raw.Invoice.InvoiceID }),
                ...(raw.Invoice.InvoiceNumber != null && { InvoiceNumber: raw.Invoice.InvoiceNumber }),
                ...(raw.Invoice.Type != null && { Type: raw.Invoice.Type })
            }
        }),
        ...(raw.CreditNote != null && { CreditNote: raw.CreditNote }),
        ...(raw.Prepayment != null && { Prepayment: raw.Prepayment }),
        ...(raw.Overpayment != null && { Overpayment: raw.Overpayment }),
        ...(raw.BatchPaymentID != null && { BatchPaymentID: raw.BatchPaymentID }),
        ...(raw.BankAccountNumber != null && { BankAccountNumber: raw.BankAccountNumber }),
        ...(raw.Code != null && { Code: raw.Code }),
        ...(raw.InvoiceNumber != null && { InvoiceNumber: raw.InvoiceNumber }),
        ...(raw.CreditNoteNumber != null && { CreditNoteNumber: raw.CreditNoteNumber }),
        ...(raw.HasValidationErrors != null && { HasValidationErrors: raw.HasValidationErrors })
    };
}

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

async function resolveTenantId(nango: NangoSyncLocal): Promise<string> {
    const connection = await nango.getConnection();
    const parsedConnection = ConnectionSchema.safeParse(connection);
    if (!parsedConnection.success) {
        throw new Error('Failed to parse connection: ' + parsedConnection.error.message);
    }

    const config = parsedConnection.data.connection_config;
    if (config && typeof config['tenant_id'] === 'string' && config['tenant_id'].length > 0) {
        return config['tenant_id'];
    }

    const meta = parsedConnection.data.metadata;
    if (meta && typeof meta['tenantId'] === 'string' && meta['tenantId'].length > 0) {
        return meta['tenantId'];
    }

    const response = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/overview
        endpoint: 'connections',
        retries: 10
    });

    if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }
    if (response.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const parsed = TenantConnectionsSchema.safeParse(response.data);
    if (parsed.success) {
        const firstConnection = parsed.data[0];
        if (firstConnection && firstConnection.tenantId.length > 0) {
            return firstConnection.tenantId;
        }
    }

    throw new Error('Unable to resolve xero-tenant-id.');
}

const sync = createSync({
    description: 'Sync payments from Xero.',
    version: '3.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        let checkpoint: z.infer<typeof CheckpointSchema> | null = null;
        if (checkpointRaw != null) {
            const parsed = CheckpointSchema.safeParse(checkpointRaw);
            if (!parsed.success) {
                throw new Error('Failed to parse checkpoint: ' + parsed.error.message);
            }
            checkpoint = parsed.data;
        }

        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string> = {};

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/payments
            endpoint: 'api.xro/2.0/Payments',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'Payments'
            },
            retries: 3
        };

        let latestUpdatedDate: Date | null = checkpoint && checkpoint.updated_after.length > 0 ? parseXeroDate(checkpoint.updated_after) : null;

        for await (const page of nango.paginate(config)) {
            const parsedPage = z.array(ProviderPaymentSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error('Failed to parse payments page: ' + parsedPage.error.message);
            }

            const records = parsedPage.data;
            if (records.length === 0) {
                continue;
            }

            const mapped = records.map(mapPayment);

            const activeRecords = mapped.filter((r) => r.Status !== 'DELETED');
            const deletedRecords = mapped.filter((r) => r.Status === 'DELETED');

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'Payment');
            }

            if (checkpoint && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'Payment');
            }

            for (const record of records) {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
