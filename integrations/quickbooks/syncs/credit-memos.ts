import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo
const CreditMemoSchema = z.object({
    Id: z.string(),
    TotalAmt: z.number().optional(),
    Balance: z.number().optional(),
    CustomerRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    CurrencyRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    BillEmail: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    TxnDate: z.string().optional(),
    PrintStatus: z.string().optional(),
    EmailStatus: z.string().optional(),
    PrivateNote: z.string().optional(),
    CustomerMemo: z
        .object({
            value: z.string().optional()
        })
        .optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.union([z.string(), z.number()]).optional(),
                Description: z.string().optional(),
                Amount: z.number().optional(),
                DetailType: z.string().optional(),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z
                            .object({
                                value: z.string().optional(),
                                name: z.string().optional()
                            })
                            .optional(),
                        Qty: z.number().optional(),
                        UnitPrice: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    status: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    SyncToken: z.string().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string()
        })
        .optional()
});

const QueryResponseSchema = z.object({
    CreditMemo: z.array(CreditMemoSchema).optional(),
    startPosition: z.number().optional(),
    maxResults: z.number().optional(),
    totalCount: z.number().optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const CreditMemoModelSchema = z.object({
    id: z.string(),
    total_amount: z.number().optional(),
    balance: z.number().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    currency_code: z.string().optional(),
    txn_date: z.string().optional(),
    status: z.string().optional(),
    private_note: z.string().optional(),
    email: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type CheckpointType = z.infer<typeof CheckpointSchema>;
type CreditMemoType = z.infer<typeof CreditMemoSchema>;
type NangoSync = Parameters<(typeof sync)['exec']>[0];

async function getRealmId(nango: NangoSync): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toCreditMemo(record: CreditMemoType): z.infer<typeof CreditMemoModelSchema> {
    return {
        id: record.Id,
        total_amount: record.TotalAmt,
        balance: record.Balance,
        customer_id: record.CustomerRef?.value,
        customer_name: record.CustomerRef?.name,
        currency_code: record.CurrencyRef?.value,
        txn_date: record.TxnDate,
        status: record.status,
        private_note: record.PrivateNote,
        email: record.BillEmail?.Address,
        created_at: record.MetaData?.CreateTime,
        updated_at: record.MetaData?.LastUpdatedTime ?? ''
    };
}

const sync = createSync({
    description: 'Sync QuickBooks credit memos',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/credit-memos',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        CreditMemo: CreditMemoModelSchema
    },

    exec: async (nango) => {
        const realmId = await getRealmId(nango);
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint: CheckpointType | undefined = checkpointResult ? CheckpointSchema.parse(checkpointResult) : undefined;

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const updatedAfter = checkpoint?.updated_after;
        const useIncremental = updatedAfter !== undefined && new Date(updatedAfter) > cutoff;

        if (useIncremental) {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-popular/change-data-capture
            const params: Record<string, string> = { entities: 'CreditMemo' };
            if (updatedAfter) {
                params['changedSince'] = updatedAfter;
            }
            for await (const records of nango.paginate({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params,
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].CreditMemo',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            })) {
                const parsedRecords = z.array(CreditMemoSchema).safeParse(records);
                if (!parsedRecords.success) {
                    throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
                }

                const validRecords = parsedRecords.data;
                const active = validRecords.filter((r) => r.status !== 'Deleted' && r.status !== 'Voided');
                const deleted = validRecords.filter((r) => r.status === 'Deleted' || r.status === 'Voided');
                if (active.length > 0) {
                    await nango.batchSave(active.map(toCreditMemo), 'CreditMemo');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'CreditMemo'
                    );
                }
                const latest = validRecords.reduce(
                    (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                    ''
                );
                if (latest) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            // Full sync using query endpoint
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-popular/query
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = updatedAfter ? ` WHERE MetaData.LastUpdatedTime > '${updatedAfter}'` : '';
                const query = `SELECT * FROM CreditMemo${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = ResponseSchema.parse(response.data);
                const results = parsed.QueryResponse.CreditMemo ?? [];

                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.status !== 'Deleted' && r.status !== 'Voided');
                const deleted = results.filter((r) => r.status === 'Deleted' || r.status === 'Voided');

                if (active.length > 0) {
                    await nango.batchSave(active.map(toCreditMemo), 'CreditMemo');
                }

                // On checkpointed query fallbacks, delete deleted or voided records.
                if (checkpoint && deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'CreditMemo'
                    );
                }

                const pageLatest = results.reduce(
                    (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                    ''
                );
                if (pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }

                if (latestUpdatedTime) {
                    await nango.saveCheckpoint({ updated_after: latestUpdatedTime });
                }

                if (results.length < maxResults) {
                    break;
                }

                startPosition += maxResults;
            }
        }
    }
});

export type NangoSyncLocal = NangoSync;
export default sync;
