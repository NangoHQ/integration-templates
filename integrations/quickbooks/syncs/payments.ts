import { createSync } from 'nango';
import { z } from 'zod';

// Provider documentation: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment

const LinkedTransactionSchema = z.object({
    Id: z.string().optional(),
    Type: z.string().optional(),
    LineNum: z.string().optional(),
    TxnType: z.string().optional(),
    TxnId: z.string().optional()
});

const LineSchema = z.object({
    Id: z.string().optional(),
    Amount: z.number().optional(),
    LinkedTxn: z.array(LinkedTransactionSchema).optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const PaymentProviderSchema = z.object({
    Id: z.string(),
    TotalAmt: z.number().optional(),
    CustomerRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    PaymentMethodRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    DepositToAccountRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    Line: z.array(LineSchema).optional(),
    MetaData: MetaDataSchema.optional(),
    status: z.string().optional()
});

const QueryResponseSchema = z.object({
    Payment: z.array(PaymentProviderSchema).optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema.optional()
});

const PaymentSchema = z.object({
    id: z.string(),
    totalAmount: z.number().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    transactionDate: z.string().optional(),
    privateNote: z.string().optional(),
    paymentMethodId: z.string().optional(),
    paymentMethodName: z.string().optional(),
    depositToAccountId: z.string().optional(),
    depositToAccountName: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                amount: z.number().optional(),
                linkedTransactions: z
                    .array(
                        z.object({
                            id: z.string().optional(),
                            type: z.string().optional(),
                            lineNum: z.string().optional(),
                            txnType: z.string().optional(),
                            txnId: z.string().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type NangoSyncInstance = {
    getConnection: () => Promise<{
        connection_config?: Record<string, unknown>;
    }>;
};

async function getCompany(nango: NangoSyncInstance): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toPayment(record: z.infer<typeof PaymentProviderSchema>): z.infer<typeof PaymentSchema> {
    return {
        id: record.Id,
        totalAmount: record.TotalAmt,
        customerId: record.CustomerRef?.value,
        customerName: record.CustomerRef?.name,
        transactionDate: record.TxnDate,
        privateNote: record.PrivateNote,
        paymentMethodId: record.PaymentMethodRef?.value,
        paymentMethodName: record.PaymentMethodRef?.name,
        depositToAccountId: record.DepositToAccountRef?.value,
        depositToAccountName: record.DepositToAccountRef?.name,
        lines: record.Line?.map((line) => ({
            id: line.Id,
            amount: line.Amount,
            linkedTransactions: line.LinkedTxn?.map((txn) => ({
                id: txn.Id,
                type: txn.Type,
                lineNum: txn.LineNum,
                txnType: txn.TxnType,
                txnId: txn.TxnId
            }))
        })),
        createdAt: record.MetaData?.CreateTime,
        updatedAt: record.MetaData?.LastUpdatedTime
    };
}

const sync = createSync({
    description: 'Sync customer payments from QuickBooks Online.',
    version: '2.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/payments' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);

        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // CDC path for incremental sync — CDC does not support offset pagination, use a single get call
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#cdc
            const cdcResponse = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: {
                    entities: 'Payment',
                    changedSince: checkpoint.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                retries: 3
            });
            const cdcRecords: unknown[] = cdcResponse.data?.CDCResponse?.[0]?.QueryResponse?.[0]?.Payment ?? [];
            const parsedRecords = z.array(PaymentProviderSchema).safeParse(cdcRecords);
            if (!parsedRecords.success) {
                throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
            }
            const validRecords = parsedRecords.data;
            const active = validRecords.filter((r) => r.status !== 'Deleted');
            const deleted = validRecords.filter((r) => r.status === 'Deleted');
            if (active.length > 0) {
                await nango.batchSave(active.map(toPayment), 'Payment');
            }
            if (deleted.length > 0) {
                await nango.batchDelete(
                    deleted.map((r) => ({ id: r.Id })),
                    'Payment'
                );
            }
            // Use all records (active + deleted) so the checkpoint always advances
            const latest = validRecords.reduce(
                (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                ''
            );
            if (latest) {
                await nango.saveCheckpoint({ updated_after: latest });
            }
        } else {
            // Full query path
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#query
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Payment${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#query
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = ResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse query response: ${parsed.error.message}`);
                }
                const results = parsed.data.QueryResponse?.Payment ?? [];
                if (results.length === 0) {
                    break;
                }

                await nango.batchSave(results.map(toPayment), 'Payment');

                const pageLatest = results.reduce(
                    (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                    ''
                );
                if (pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }

                if (results.length < maxResults) {
                    break;
                }
                startPosition += maxResults;
            }

            if (latestUpdatedTime) {
                await nango.saveCheckpoint({ updated_after: latestUpdatedTime });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
