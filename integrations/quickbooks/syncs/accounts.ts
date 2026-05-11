import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountType: z.string().optional(),
    accountSubType: z.string().optional(),
    fullyQualifiedName: z.string().optional(),
    classification: z.string().optional(),
    currentBalance: z.number().optional(),
    currentBalanceWithSubAccounts: z.number().optional(),
    currencyRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    active: z.boolean().optional(),
    description: z.string().optional(),
    subAccount: z.boolean().optional(),
    parentRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    level: z.number().optional(),
    txnLocationType: z.string().optional(),
    acctNum: z.string().optional(),
    bankNum: z.string().optional(),
    openedBalance: z.number().optional(),
    onlineBankingEnabled: z.boolean().optional(),
    taxCodeRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    metaData: z
        .object({
            createTime: z.string().optional(),
            lastUpdatedTime: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const QuickBooksAccountSchema = z.object({
    Id: z.string(),
    Name: z.string(),
    AccountType: z.string().optional(),
    AccountSubType: z.string().optional(),
    FullyQualifiedName: z.string().optional(),
    Classification: z.string().optional(),
    CurrentBalance: z.number().optional(),
    CurrentBalanceWithSubAccounts: z.number().optional(),
    CurrencyRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    Active: z.boolean().optional(),
    Description: z.string().optional(),
    SubAccount: z.boolean().optional(),
    ParentRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    Level: z.number().optional(),
    TxnLocationType: z.string().optional(),
    AcctNum: z.string().optional(),
    BankNum: z.string().optional(),
    OpenedBalance: z.number().optional(),
    OnlineBankingEnabled: z.boolean().optional(),
    TaxCodeRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    MetaData: MetaDataSchema.optional()
});

const QueryResponseSchema = z.object({
    Account: z.array(QuickBooksAccountSchema).optional()
});

const QueryResponseWrapperSchema = z.object({
    QueryResponse: QueryResponseSchema.optional()
});

async function getCompany(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toAccount(record: z.infer<typeof QuickBooksAccountSchema>): z.infer<typeof AccountSchema> {
    return {
        id: record.Id,
        name: record.Name,
        accountType: record.AccountType,
        accountSubType: record.AccountSubType,
        fullyQualifiedName: record.FullyQualifiedName,
        classification: record.Classification,
        currentBalance: record.CurrentBalance,
        currentBalanceWithSubAccounts: record.CurrentBalanceWithSubAccounts,
        currencyRef: record.CurrencyRef,
        domain: record.domain,
        sparse: record.sparse,
        active: record.Active,
        description: record.Description,
        subAccount: record.SubAccount,
        parentRef: record.ParentRef,
        level: record.Level,
        txnLocationType: record.TxnLocationType,
        acctNum: record.AcctNum,
        bankNum: record.BankNum,
        openedBalance: record.OpenedBalance,
        onlineBankingEnabled: record.OnlineBankingEnabled,
        taxCodeRef: record.TaxCodeRef,
        metaData: {
            createTime: record.MetaData?.CreateTime,
            lastUpdatedTime: record.MetaData?.LastUpdatedTime
        }
    };
}

const sync = createSync<{ Account: typeof AccountSchema }, never, typeof CheckpointSchema>({
    description: 'Sync chart of accounts records from QuickBooks Online',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },
    endpoints: [
        {
            path: '/syncs/accounts',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const checkpoint = await nango.getCheckpoint();
        const checkpointData = CheckpointSchema.safeParse(checkpoint);
        const checkpointValue = checkpointData.success ? checkpointData.data : { updated_after: '' };

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpointValue.updated_after && new Date(checkpointValue.updated_after) > cutoff;

        if (useIncremental) {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/cdc
            const cdcEndpoint = `/v3/company/${encodeURIComponent(realmId)}/cdc`;

            for await (const records of nango.paginate({
                endpoint: cdcEndpoint,
                params: {
                    entities: 'Account',
                    changedSince: checkpointValue.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Account',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            })) {
                const parsedRecords = z.array(QuickBooksAccountSchema).safeParse(records);
                if (!parsedRecords.success) {
                    throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
                }

                const active = parsedRecords.data.filter((r) => r.Active !== false);
                const deleted = parsedRecords.data.filter((r) => r.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toAccount), 'Account');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Account'
                    );
                }

                const latest = parsedRecords.data.reduce((max, r) => {
                    const lastUpdated = r.MetaData?.LastUpdatedTime;
                    return lastUpdated && lastUpdated > max ? lastUpdated : max;
                }, '');
                if (latest) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpointValue?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpointValue.updated_after}'` : '';
                const query = `SELECT * FROM Account${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/query
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = QueryResponseWrapperSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse query response: ${parsed.error.message}`);
                }

                const results = parsed.data.QueryResponse?.Account ?? [];
                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.Active !== false);
                const inactive = results.filter((r) => r.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toAccount), 'Account');
                }
                if (checkpointValue.updated_after && inactive.length > 0) {
                    await nango.batchDelete(
                        inactive.map((r) => ({ id: r.Id })),
                        'Account'
                    );
                }

                const pageLatest = results.reduce((max, r) => {
                    const lastUpdated = r.MetaData?.LastUpdatedTime;
                    return lastUpdated && lastUpdated > max ? lastUpdated : max;
                }, '');
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
