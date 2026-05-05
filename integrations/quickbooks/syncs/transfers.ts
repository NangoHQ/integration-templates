import { createSync } from 'nango';
import { z } from 'zod';

// Account reference schema
const AccountRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

// Metadata schema
const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

// Transfer record schema (raw from QuickBooks)
const QBTransferSchema = z.object({
    Id: z.string(),
    FromAccountRef: AccountRefSchema.optional(),
    ToAccountRef: AccountRefSchema.optional(),
    Amount: z.number().optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    MetaData: MetaDataSchema,
    status: z.string().optional()
});

// QuickBooks Transfer raw type from API
type QBTransfer = z.infer<typeof QBTransferSchema>;

// Transfer model schema
const TransferSchema = z.object({
    id: z.string(),
    fromAccountRef: z.object({
        value: z.string(),
        name: z.string().optional()
    }),
    toAccountRef: z.object({
        value: z.string(),
        name: z.string().optional()
    }),
    amount: z.number(),
    txnDate: z.string(),
    privateNote: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});

type Transfer = z.infer<typeof TransferSchema>;

// Checkpoint schema for incremental sync
const CheckpointSchema = z.object({
    updated_after: z.string()
});

// QuickBooks API response schema for query endpoint
const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        Transfer: z.array(QBTransferSchema).optional()
    })
});

// CDC response schema
const CDCResponseSchema = z.object({
    CDCResponse: z.array(
        z.object({
            QueryResponse: z.array(
                z.object({
                    Transfer: z.array(QBTransferSchema).optional()
                })
            )
        })
    )
});

// Helper function to get realmId from connection
async function getRealmId(nango: {
    getConnection: () => Promise<{
        connection_config?: Record<string, unknown>;
    }>;
}): Promise<string> {
    // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

// Helper to map QuickBooks transfer to Nango model
function toTransfer(raw: QBTransfer): Transfer {
    const transfer: Transfer = {
        id: raw.Id,
        fromAccountRef: {
            value: raw.FromAccountRef?.value ?? ''
        },
        toAccountRef: {
            value: raw.ToAccountRef?.value ?? ''
        },
        amount: raw.Amount ?? 0,
        txnDate: raw.TxnDate ?? '',
        createdAt: raw.MetaData.CreateTime,
        updatedAt: raw.MetaData.LastUpdatedTime
    };

    const fromName = raw.FromAccountRef?.name;
    if (fromName !== undefined) {
        transfer.fromAccountRef.name = fromName;
    }

    const toName = raw.ToAccountRef?.name;
    if (toName !== undefined) {
        transfer.toAccountRef.name = toName;
    }

    if (raw.PrivateNote !== undefined) {
        transfer.privateNote = raw.PrivateNote;
    }

    return transfer;
}

const sync = createSync({
    description: 'Sync QuickBooks transfers',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/transfers' }],
    models: {
        Transfer: TransferSchema
    },

    exec: async (nango) => {
        const realmId = await getRealmId(nango);
        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);

        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
            // CDC endpoint for incremental sync
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
                    entities: 'Transfer',
                    changedSince: checkpoint.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Transfer',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };

            for await (const records of nango.paginate(proxyConfig)) {
                if (!records || records.length === 0) {
                    continue;
                }

                const cdcData = CDCResponseSchema.parse({
                    CDCResponse: [{ QueryResponse: [{ Transfer: records }] }]
                });
                const cdcResponse = cdcData.CDCResponse[0];
                if (!cdcResponse) {
                    continue;
                }
                const queryResponse = cdcResponse.QueryResponse[0];
                if (!queryResponse) {
                    continue;
                }
                const parsedRecords = queryResponse.Transfer;

                if (!parsedRecords || parsedRecords.length === 0) {
                    continue;
                }

                const active = parsedRecords.filter((r) => r.status !== 'Deleted');
                const deleted = parsedRecords.filter((r) => r.status === 'Deleted');

                if (active.length > 0) {
                    const transfers: Transfer[] = active.map((r) => toTransfer(r));
                    await nango.batchSave(transfers, 'Transfer');
                }

                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Transfer'
                    );
                }

                const latest = active.reduce((max, r) => (r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max), '');
                if (latest) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            // Full sync using query endpoint
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Transfer${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const results = QueryResponseSchema.parse(response.data).QueryResponse.Transfer;

                if (!results || results.length === 0) {
                    break;
                }

                const transfers: Transfer[] = results.map((r) => toTransfer(r));
                await nango.batchSave(transfers, 'Transfer');

                const pageLatest = results.reduce((max, r) => (r.MetaData.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max), '');
                if (pageLatest > latestUpdatedTime) {
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
