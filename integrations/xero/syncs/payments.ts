import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const PaymentSchema = z.object({
    id: z.string(),
    date: z.string().optional(),
    amount: z.number().optional(),
    bank_amount: z.number().optional(),
    reference: z.string().optional(),
    currency_rate: z.number().optional(),
    status: z.string(),
    payment_type: z.string().optional(),
    updated_date_utc: z.string(),
    is_reconciled: z.boolean().optional(),
    has_account: z.boolean().optional(),
    invoice_id: z.string().optional(),
    credit_note_id: z.string().optional(),
    account_id: z.string().optional(),
    batch_payment_id: z.string().optional()
});

function getStringProperty(obj: unknown, key: string): string | undefined {
    const parsed = z.record(z.string(), z.unknown()).safeParse(obj);
    if (parsed.success && typeof parsed.data[key] === 'string') {
        return parsed.data[key];
    }
    return undefined;
}

function parseUpdatedDateUTC(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const match = value.match(/Date\((\d+)(?:[+-]\d+)?\)/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10)).toISOString();
    }
    if (value.includes('T')) {
        return value;
    }
    return undefined;
}

async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<unknown>;
}): Promise<string> {
    const connection = await nango.getConnection();

    if (
        connection &&
        typeof connection === 'object' &&
        'connection_config' in connection &&
        connection.connection_config &&
        typeof connection.connection_config === 'object' &&
        'tenant_id' in connection.connection_config &&
        typeof connection.connection_config.tenant_id === 'string'
    ) {
        return connection.connection_config.tenant_id;
    }

    if (
        connection &&
        typeof connection === 'object' &&
        'metadata' in connection &&
        connection.metadata &&
        typeof connection.metadata === 'object' &&
        'tenantId' in connection.metadata &&
        typeof connection.metadata.tenantId === 'string'
    ) {
        return connection.metadata.tenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsedResponse = z
        .object({
            data: z.array(z.record(z.string(), z.unknown()))
        })
        .safeParse(response);

    if (!parsedResponse.success) {
        throw new Error('Failed to parse connections response.');
    }

    const connections = parsedResponse.data.data;
    if (connections.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }
    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const connectionEntry = connections[0];
    if (!connectionEntry) {
        throw new Error('No Xero tenants found for this connection.');
    }

    const tenantId = connectionEntry['tenantId'];
    if (typeof tenantId !== 'string') {
        throw new Error('tenantId not found in connections response.');
    }

    return tenantId;
}

function mapPayment(record: Record<string, unknown>) {
    const invoice = record['Invoice'];
    const creditNote = record['CreditNote'];
    const account = record['Account'];

    return {
        id: typeof record['PaymentID'] === 'string' ? record['PaymentID'] : '',
        date: typeof record['Date'] === 'string' ? record['Date'] : undefined,
        amount: typeof record['Amount'] === 'number' ? record['Amount'] : undefined,
        bank_amount: typeof record['BankAmount'] === 'number' ? record['BankAmount'] : undefined,
        reference: typeof record['Reference'] === 'string' ? record['Reference'] : undefined,
        currency_rate: typeof record['CurrencyRate'] === 'number' ? record['CurrencyRate'] : undefined,
        status: typeof record['Status'] === 'string' ? record['Status'] : '',
        payment_type: typeof record['PaymentType'] === 'string' ? record['PaymentType'] : undefined,
        updated_date_utc: parseUpdatedDateUTC(record['UpdatedDateUTC']) ?? '',
        is_reconciled: typeof record['IsReconciled'] === 'boolean' ? record['IsReconciled'] : undefined,
        has_account: typeof record['HasAccount'] === 'boolean' ? record['HasAccount'] : undefined,
        invoice_id: getStringProperty(invoice, 'InvoiceID'),
        credit_note_id: getStringProperty(creditNote, 'CreditNoteID'),
        account_id: getStringProperty(account, 'AccountID'),
        batch_payment_id: typeof record['BatchPaymentID'] === 'string' ? record['BatchPaymentID'] : undefined
    };
}

const sync = createSync({
    description: 'Sync payments from Xero.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/payments'
        }
    ],
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {};

        if (
            checkpoint &&
            typeof checkpoint === 'object' &&
            'updated_after' in checkpoint &&
            typeof checkpoint.updated_after === 'string' &&
            checkpoint.updated_after.length > 0
        ) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        for await (const page of nango.paginate({
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
        })) {
            const pageSchema = z.array(z.record(z.string(), z.unknown()));
            const parsedPage = pageSchema.safeParse(page);
            if (!parsedPage.success) {
                continue;
            }

            const activeRecords = parsedPage.data.filter((record) => typeof record['Status'] === 'string' && record['Status'] === 'AUTHORISED').map(mapPayment);

            const deletedRecords = parsedPage.data.filter((record) => typeof record['Status'] === 'string' && record['Status'] === 'DELETED').map(mapPayment);

            if (activeRecords.length > 0) {
                await nango.batchSave(activeRecords, 'Payment');
            }

            if (checkpoint && deletedRecords.length > 0) {
                await nango.batchDelete(deletedRecords, 'Payment');
            }

            const dates = parsedPage.data
                .map((record) => parseUpdatedDateUTC(record['UpdatedDateUTC']))
                .filter((value): value is string => typeof value === 'string');

            if (dates.length > 0) {
                const latestDate = dates.sort().pop();
                if (latestDate) {
                    await nango.saveCheckpoint({ updated_after: latestDate });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
