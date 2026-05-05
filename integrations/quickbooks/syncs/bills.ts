import { createSync } from 'nango';
import { z } from 'zod';

const LineSchema = z.object({
    Id: z.string().optional(),
    Description: z.string().optional(),
    Amount: z.number().optional(),
    DetailType: z.string().optional(),
    ItemBasedExpenseLineDetail: z
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
        .optional(),
    AccountBasedExpenseLineDetail: z
        .object({
            AccountRef: z
                .object({
                    value: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const VendorRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ProviderBillSchema = z.object({
    Id: z.string(),
    VendorRef: VendorRefSchema.optional(),
    Line: z.array(LineSchema).optional(),
    Balance: z.number().optional(),
    DueDate: z.string().optional(),
    TxnDate: z.string().optional(),
    TotalAmt: z.number().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    MetaData: MetaDataSchema.optional()
});

const BillQueryResponseSchema = z.object({
    QueryResponse: z.object({
        Bill: z.array(ProviderBillSchema).optional()
    })
});

const CDCBillSchema = z.object({
    Id: z.string(),
    VendorRef: VendorRefSchema.optional(),
    Line: z.array(LineSchema).optional(),
    Balance: z.number().optional(),
    DueDate: z.string().optional(),
    TxnDate: z.string().optional(),
    TotalAmt: z.number().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    MetaData: MetaDataSchema.optional(),
    status: z.string().optional()
});

const CDCQueryResponseSchema = z.object({
    CDCResponse: z
        .array(
            z.object({
                QueryResponse: z
                    .array(
                        z.object({
                            Bill: z.array(CDCBillSchema).optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const BillSchema = z.object({
    id: z.string(),
    vendorId: z.string().optional(),
    vendorName: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                description: z.string().optional(),
                amount: z.number().optional(),
                detailType: z.string().optional(),
                itemRef: z.string().optional(),
                itemName: z.string().optional(),
                quantity: z.number().optional(),
                unitPrice: z.number().optional(),
                accountRef: z.string().optional(),
                accountName: z.string().optional()
            })
        )
        .optional(),
    balance: z.number().optional(),
    dueDate: z.string().optional(),
    txnDate: z.string().optional(),
    totalAmount: z.number().optional(),
    docNumber: z.string().optional(),
    privateNote: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type ProviderBill = z.infer<typeof ProviderBillSchema>;
type Bill = z.infer<typeof BillSchema>;
type NangoSync = Parameters<typeof sync.exec>[0];

async function getCompany(nango: NangoSync): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toBill(record: ProviderBill): Bill {
    return {
        id: record.Id,
        vendorId: record.VendorRef?.value,
        vendorName: record.VendorRef?.name,
        lines: record.Line?.map((line) => ({
            id: line.Id,
            description: line.Description,
            amount: line.Amount,
            detailType: line.DetailType,
            itemRef: line.ItemBasedExpenseLineDetail?.ItemRef?.value,
            itemName: line.ItemBasedExpenseLineDetail?.ItemRef?.name,
            quantity: line.ItemBasedExpenseLineDetail?.Qty,
            unitPrice: line.ItemBasedExpenseLineDetail?.UnitPrice,
            accountRef: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
            accountName: line.AccountBasedExpenseLineDetail?.AccountRef?.name
        })),
        balance: record.Balance,
        dueDate: record.DueDate,
        txnDate: record.TxnDate,
        totalAmount: record.TotalAmt,
        docNumber: record.DocNumber,
        privateNote: record.PrivateNote,
        createdAt: record.MetaData?.CreateTime,
        updatedAt: record.MetaData?.LastUpdatedTime
    };
}

const sync = createSync({
    description: 'Sync vendor bills from QuickBooks Online.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/bills' }],
    checkpoint: CheckpointSchema,
    models: {
        Bill: BillSchema
    },

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // CDC does not support offset pagination — use a single get call
            // CDC path - https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/cdc
            const cdcResponse = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: { entities: 'Bill', changedSince: checkpoint.updated_after },
                headers: { 'Content-Type': 'text/plain' },
                retries: 3
            });
            const parsed = CDCQueryResponseSchema.parse(cdcResponse.data);
            const bills = parsed.CDCResponse?.[0]?.QueryResponse?.[0]?.Bill ?? [];

            const active = bills.filter((r) => r.status !== 'Deleted');
            const deleted = bills.filter((r) => r.status === 'Deleted');

            if (active.length > 0) {
                await nango.batchSave(
                    active.map((r) =>
                        toBill({
                            Id: r.Id,
                            VendorRef: r.VendorRef,
                            Line: r.Line,
                            Balance: r.Balance,
                            DueDate: r.DueDate,
                            TxnDate: r.TxnDate,
                            TotalAmt: r.TotalAmt,
                            DocNumber: r.DocNumber,
                            PrivateNote: r.PrivateNote,
                            MetaData: r.MetaData
                        })
                    ),
                    'Bill'
                );
            }
            if (deleted.length > 0) {
                await nango.batchDelete(
                    deleted.map((r) => ({ id: r.Id })),
                    'Bill'
                );
            }

            const latest = bills.reduce((max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max), '');
            if (latest) {
                await nango.saveCheckpoint({ updated_after: latest });
            }
        } else {
            // Full query path - https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Bill${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = BillQueryResponseSchema.parse(response.data);
                const results = parsed.QueryResponse.Bill ?? [];

                if (results.length === 0) {
                    break;
                }

                await nango.batchSave(results.map(toBill), 'Bill');

                const pageLatest = results.reduce(
                    (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                    ''
                );
                if (pageLatest && pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }

                await nango.saveCheckpoint({ updated_after: latestUpdatedTime });

                if (results.length < maxResults) {
                    break;
                }
                startPosition += maxResults;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
