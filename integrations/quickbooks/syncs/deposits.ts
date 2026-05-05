import { createSync } from 'nango';
import { z } from 'zod';

// Provider documentation: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/deposit

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const DepositLineSchema = z.object({
    Id: z.string().optional(),
    Description: z.string().optional(),
    Amount: z.number().optional(),
    DetailType: z.string().optional(),
    // DepositLineDetail or SalesItemLineDetail depending on DetailType
    DepositLineDetail: z
        .object({
            AccountRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            PaymentMethodRef: z
                .object({
                    value: z.string().optional(),
                    name: z.string().optional()
                })
                .optional(),
            CheckNum: z.string().optional(),
            TxnType: z.string().optional()
        })
        .optional(),
    SalesItemLineDetail: z
        .object({
            ItemRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            UnitPrice: z.number().optional(),
            Qty: z.number().optional()
        })
        .optional()
});

const DepositSchema = z.object({
    Id: z.string(),
    SyncToken: z.string().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string()
        })
        .passthrough(),
    status: z.string().optional(), // 'Deleted' from CDC
    Active: z.boolean().optional(),
    DepositToAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    DocNumber: z.string().optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    TotalAmt: z.number().optional(),
    Line: z.array(DepositLineSchema.passthrough()).optional(),
    CurrencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    ExchangeRate: z.number().optional(),
    HomeTotalAmt: z.number().optional()
});

type Deposit = z.infer<typeof DepositSchema>;

const QueryResponseSchema = z.object({
    Deposit: z.array(DepositSchema.passthrough()).optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema.optional()
});

const DepositModelSchema = z.object({
    id: z.string(),
    syncToken: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string(),
    depositToAccountId: z.string().optional(),
    depositToAccountName: z.string().optional(),
    documentNumber: z.string().optional(),
    transactionDate: z.string().optional(),
    privateNote: z.string().optional(),
    totalAmount: z.number().optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
    homeTotalAmount: z.number().optional(),
    lines: z.array(z.record(z.string(), z.unknown())).optional()
});

type DepositModel = z.infer<typeof DepositModelSchema>;

async function getCompanyId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toDepositModel(deposit: Deposit): DepositModel {
    const lines: Array<Record<string, unknown>> =
        deposit.Line?.map((line) => {
            const mapped: Record<string, unknown> = {
                id: line.Id,
                description: line.Description,
                amount: line.Amount,
                detailType: line.DetailType
            };
            if (line.DepositLineDetail) {
                mapped['depositLineDetail'] = {
                    accountId: line.DepositLineDetail.AccountRef?.value,
                    accountName: line.DepositLineDetail.AccountRef?.name,
                    paymentMethodId: line.DepositLineDetail.PaymentMethodRef?.value,
                    checkNumber: line.DepositLineDetail.CheckNum,
                    txnType: line.DepositLineDetail.TxnType
                };
            }
            if (line.SalesItemLineDetail) {
                mapped['salesItemLineDetail'] = {
                    itemId: line.SalesItemLineDetail.ItemRef?.value,
                    itemName: line.SalesItemLineDetail.ItemRef?.name,
                    unitPrice: line.SalesItemLineDetail.UnitPrice,
                    quantity: line.SalesItemLineDetail.Qty
                };
            }
            return mapped;
        }) ?? [];

    return {
        id: deposit.Id,
        syncToken: deposit.SyncToken,
        createdAt: deposit.MetaData?.CreateTime,
        updatedAt: deposit.MetaData.LastUpdatedTime,
        depositToAccountId: deposit.DepositToAccountRef?.value,
        depositToAccountName: deposit.DepositToAccountRef?.name,
        documentNumber: deposit.DocNumber,
        transactionDate: deposit.TxnDate,
        privateNote: deposit.PrivateNote,
        totalAmount: deposit.TotalAmt,
        currency: deposit.CurrencyRef?.value,
        exchangeRate: deposit.ExchangeRate,
        homeTotalAmount: deposit.HomeTotalAmt,
        lines: lines.length > 0 ? lines : undefined
    };
}

const sync = createSync({
    description: 'Sync deposit transactions from QuickBooks Online.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deposit: DepositModelSchema
    },

    endpoints: [
        {
            path: '/syncs/deposits',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const realmId = await getCompanyId(nango);
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint: Checkpoint | undefined = checkpointResult ? CheckpointSchema.parse(checkpointResult) : undefined;

        // Deposit is not a CDC-supported QuickBooks entity, so keep query-based checkpointing.
        let startPosition = 1;
        const maxResults = 100;
        let latestUpdatedTime = '';

        while (true) {
            // Provider docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/deposit
            const filter =
                checkpoint?.updated_after && checkpoint.updated_after.length > 0 ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
            const query = `SELECT * FROM Deposit${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

            const response = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                params: { query },
                retries: 10
            });

            const parsed = ResponseSchema.parse(response.data);
            const results = parsed.QueryResponse?.Deposit ?? [];

            if (results.length === 0) {
                break;
            }

            await nango.batchSave(results.map(toDepositModel), 'Deposit');

            const pageLatest = results.reduce((max: string, r) => {
                const time = r.MetaData?.LastUpdatedTime ?? '';
                return time > max ? time : max;
            }, '');
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
