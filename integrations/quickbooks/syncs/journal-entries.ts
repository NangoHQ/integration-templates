import { createSync } from 'nango';
import { z } from 'zod';

// QuickBooks JournalEntry API reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry

const JournalEntryLineSchema = z.object({
    Id: z.string().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.string(),
    PostingType: z.string().optional(),
    AccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    Entity: z
        .object({
            Type: z.string().optional(),
            EntityRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional()
        })
        .optional(),
    ClassRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    DepartmentRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    TaxCodeRef: z
        .object({
            value: z.string()
        })
        .optional(),
    TaxApplicableOn: z.string().optional(),
    BillableStatus: z.string().optional()
});

const JournalEntrySchema = z.object({
    Id: z.string(),
    DocNumber: z.string().optional(),
    TxnDate: z.string(),
    PrivateNote: z.string().optional(),
    Line: z.array(JournalEntryLineSchema),
    MetaData: z.object({
        CreateTime: z.string(),
        LastUpdatedTime: z.string()
    }),
    CurrencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    ExchangeRate: z.number().optional(),
    Adjustment: z.boolean().optional(),
    status: z.string().optional()
});

const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        JournalEntry: z.array(JournalEntrySchema).optional()
    })
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type JournalEntryType = z.infer<typeof JournalEntrySchema>;

const JournalEntryModel = z.object({
    id: z.string(),
    docNumber: z.string().optional(),
    txnDate: z.string(),
    privateNote: z.string().optional(),
    line: z.array(
        z.object({
            id: z.string().optional(),
            description: z.string().optional(),
            amount: z.number(),
            detailType: z.string(),
            postingType: z.string().optional(),
            accountRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            entity: z
                .object({
                    type: z.string().optional(),
                    entityRef: z
                        .object({
                            value: z.string(),
                            name: z.string().optional(),
                            type: z.string().optional()
                        })
                        .optional()
                })
                .optional(),
            classRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            departmentRef: z
                .object({
                    value: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            taxCodeRef: z
                .object({
                    value: z.string()
                })
                .optional(),
            taxApplicableOn: z.string().optional(),
            billableStatus: z.string().optional()
        })
    ),
    metaData: z.object({
        createTime: z.string(),
        lastUpdatedTime: z.string()
    }),
    currencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    exchangeRate: z.number().optional(),
    adjustment: z.boolean().optional()
});

const sync = createSync<
    {
        JournalEntry: typeof JournalEntryModel;
    },
    undefined,
    typeof CheckpointSchema
>({
    description: 'Sync QuickBooks journal entries',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        JournalEntry: JournalEntryModel
    },

    endpoints: [
        {
            method: 'POST',
            path: '/syncs/journal-entries'
        }
    ],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];
        if (!realmId) {
            throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
        }

        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
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
                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: {
                    entities: 'JournalEntry',
                    changedSince: checkpoint.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].JournalEntry',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };

            for await (const records of nango.paginate(proxyConfig)) {
                const parsed = z.array(JournalEntrySchema).safeParse(records);
                if (!parsed.success) {
                    throw new Error(`Failed to parse CDC response: ${parsed.error.message}`);
                }

                const journalEntries = parsed.data;
                const active = journalEntries.filter((r) => r.status !== 'Deleted');
                const deleted = journalEntries.filter((r) => r.status === 'Deleted');

                if (active.length > 0) {
                    const mapped = active.map((r) => toJournalEntry(r));
                    await nango.batchSave(mapped, 'JournalEntry');
                }

                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'JournalEntry'
                    );
                }

                const latest = active.reduce((max, r) => (r.MetaData?.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max), '');
                if (latest) {
                    await nango.saveCheckpoint({
                        updated_after: latest
                    });
                }
            }
        } else {
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM JournalEntry${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = QueryResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse query response: ${parsed.error.message}`);
                }

                const results = parsed.data.QueryResponse.JournalEntry ?? [];
                if (results.length === 0) {
                    break;
                }

                const mapped = results.map((r) => toJournalEntry(r));
                await nango.batchSave(mapped, 'JournalEntry');

                const pageLatest = results.reduce((max, r) => (r.MetaData?.LastUpdatedTime > max ? r.MetaData.LastUpdatedTime : max), '');
                if (pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }
                await nango.saveCheckpoint({
                    updated_after: latestUpdatedTime
                });

                if (results.length < maxResults) {
                    break;
                }
                startPosition += maxResults;
            }
        }
    }
});

function toJournalEntry(record: JournalEntryType) {
    return {
        id: record.Id,
        docNumber: record.DocNumber,
        txnDate: record.TxnDate,
        privateNote: record.PrivateNote,
        line: record.Line.map((line) => ({
            id: line.Id,
            description: line.Description,
            amount: line.Amount,
            detailType: line.DetailType,
            postingType: line.PostingType,
            accountRef: line.AccountRef
                ? {
                      value: line.AccountRef.value,
                      name: line.AccountRef.name
                  }
                : undefined,
            entity: line.Entity
                ? {
                      type: line.Entity.Type,
                      entityRef: line.Entity.EntityRef
                          ? {
                                value: line.Entity.EntityRef.value,
                                name: line.Entity.EntityRef.name,
                                type: line.Entity.EntityRef.type
                            }
                          : undefined
                  }
                : undefined,
            classRef: line.ClassRef
                ? {
                      value: line.ClassRef.value,
                      name: line.ClassRef.name
                  }
                : undefined,
            departmentRef: line.DepartmentRef
                ? {
                      value: line.DepartmentRef.value,
                      name: line.DepartmentRef.name
                  }
                : undefined,
            taxCodeRef: line.TaxCodeRef
                ? {
                      value: line.TaxCodeRef.value
                  }
                : undefined,
            taxApplicableOn: line.TaxApplicableOn,
            billableStatus: line.BillableStatus
        })),
        metaData: {
            createTime: record.MetaData.CreateTime,
            lastUpdatedTime: record.MetaData.LastUpdatedTime
        },
        currencyRef: record.CurrencyRef
            ? {
                  value: record.CurrencyRef.value,
                  name: record.CurrencyRef.name
              }
            : undefined,
        exchangeRate: record.ExchangeRate,
        adjustment: record.Adjustment
    };
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
