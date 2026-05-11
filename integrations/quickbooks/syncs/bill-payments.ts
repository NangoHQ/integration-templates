import { createSync } from 'nango';
import { z } from 'zod';

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const BillPaymentSchema = z.object({
    Id: z.string(),
    Active: z.boolean().optional(),
    status: z.string().optional(),
    MetaData: MetaDataSchema.optional(),
    TotalAmt: z.number().optional(),
    PayType: z.string().optional(),
    PrivateNote: z.string().optional(),
    TxnDate: z.string().optional(),
    DocNumber: z.string().optional(),
    VendorRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    APAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    CheckPayment: z
        .object({
            BankAccountRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            PrintStatus: z.string().optional()
        })
        .optional(),
    CreditCardPayment: z
        .object({
            CCAccountRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.string().optional(),
                Amount: z.number(),
                LinkedTxn: z
                    .array(
                        z.object({
                            TxnId: z.string(),
                            TxnType: z.string()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const QueryResponseSchema = z.object({
    BillPayment: z.array(BillPaymentSchema).optional(),
    maxResults: z.number().optional(),
    startPosition: z.number().optional(),
    totalCount: z.number().optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const BillPaymentModelSchema = z.object({
    id: z.string(),
    active: z.boolean().optional(),
    total_amount: z.number().optional(),
    pay_type: z.string().optional(),
    private_note: z.string().optional(),
    transaction_date: z.string().optional(),
    document_number: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    ap_account_id: z.string().optional(),
    ap_account_name: z.string().optional(),
    check_bank_account_id: z.string().optional(),
    check_bank_account_name: z.string().optional(),
    check_print_status: z.string().optional(),
    credit_card_account_id: z.string().optional(),
    credit_card_account_name: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                line_num: z.string().optional(),
                amount: z.number(),
                linked_transactions: z
                    .array(
                        z.object({
                            transaction_id: z.string(),
                            transaction_type: z.string()
                        })
                    )
                    .optional()
            })
        )
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

async function getCompany(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toBillPayment(record: z.infer<typeof BillPaymentSchema>): z.infer<typeof BillPaymentModelSchema> {
    const checkBankAccount = record.CheckPayment?.BankAccountRef;
    const creditCardAccount = record.CreditCardPayment?.CCAccountRef;

    return {
        id: record.Id,
        active: record.Active,
        total_amount: record.TotalAmt,
        pay_type: record.PayType,
        private_note: record.PrivateNote,
        transaction_date: record.TxnDate,
        document_number: record.DocNumber,
        vendor_id: record.VendorRef?.value,
        vendor_name: record.VendorRef?.name,
        ap_account_id: record.APAccountRef?.value,
        ap_account_name: record.APAccountRef?.name,
        check_bank_account_id: checkBankAccount?.value,
        check_bank_account_name: checkBankAccount?.name,
        check_print_status: record.CheckPayment?.PrintStatus,
        credit_card_account_id: creditCardAccount?.value,
        credit_card_account_name: creditCardAccount?.name,
        lines: record.Line?.map((line) => ({
            id: line.Id,
            line_num: line.LineNum,
            amount: line.Amount,
            linked_transactions: line.LinkedTxn?.map((txn) => ({
                transaction_id: txn.TxnId,
                transaction_type: txn.TxnType
            }))
        })),
        created_at: record.MetaData?.CreateTime,
        updated_at: record.MetaData?.LastUpdatedTime
    };
}

const sync = createSync({
    description: 'Sync QuickBooks bill payments',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BillPayment: BillPaymentModelSchema
    },
    endpoints: [
        {
            path: '/syncs/bill-payments',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const rawCheckpoint: unknown = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint: Checkpoint | undefined = checkpointResult.success ? checkpointResult.data : undefined;

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/billpayment#using-change-data-capture
            const proxyConfig: {
                endpoint: string;
                params: { entities: string; changedSince: string };
                headers: { 'Content-Type': string };
                paginate: {
                    type: 'offset';
                    offset_name_in_request: string;
                    response_path: string;
                    limit_name_in_request: string;
                    limit: number;
                };
                retries: number;
            } = {
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: {
                    entities: 'BillPayment',
                    changedSince: checkpoint.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].BillPayment',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };
            for await (const records of nango.paginate(proxyConfig)) {
                const results = z.array(BillPaymentSchema).safeParse(records);
                if (!results.success) {
                    throw new Error(`Failed to parse CDC records: ${results.error.message}`);
                }
                const validRecords = results.data;
                const active = validRecords.filter((r) => r.status !== 'Deleted' && r.Active !== false);
                const deleted = validRecords.filter((r) => r.status === 'Deleted' || r.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toBillPayment), 'BillPayment');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'BillPayment'
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
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/billpayment#query-a-billpayment-object
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM BillPayment${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = ResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse query response: ${parsed.error.message}`);
                }

                const results = parsed.data.QueryResponse.BillPayment ?? [];
                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.status !== 'Deleted' && r.Active !== false);
                const deleted = results.filter((r) => r.status === 'Deleted' || r.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toBillPayment), 'BillPayment');
                }
                if (checkpoint?.updated_after && deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'BillPayment'
                    );
                }

                const pageLatest = results.reduce(
                    (max, r) => (r.MetaData?.LastUpdatedTime && r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max),
                    ''
                );
                if (pageLatest && pageLatest > latestUpdatedTime) {
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

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
