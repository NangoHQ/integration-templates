import { createSync } from 'nango';
import { z } from 'zod';

// API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/Invoice

const InvoiceSchema = z.object({
    Id: z.string(),
    DocNumber: z.string().optional(),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    Balance: z.number().optional(),
    TotalAmt: z.number().optional(),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                DetailType: z.string().optional(),
                Description: z.string().optional(),
                Amount: z.number().optional(),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z
                            .object({
                                value: z.string(),
                                name: z.string().optional()
                            })
                            .optional()
                    })
                    .optional()
            })
        )
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional(),
    status: z.string().optional()
});

const QueryResponseSchema = z.object({
    Invoice: z.array(InvoiceSchema).optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema.optional()
});

const InvoiceModelSchema = z.object({
    id: z.string(),
    docNumber: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    balance: z.string().optional(),
    totalAmt: z.string().optional(),
    lines: z
        .array(
            z.object({
                id: z.string().optional(),
                detailType: z.string().optional(),
                description: z.string().optional(),
                amount: z.string().optional(),
                itemId: z.string().optional(),
                itemName: z.string().optional()
            })
        )
        .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toInvoice(record: z.infer<typeof InvoiceSchema>): z.infer<typeof InvoiceModelSchema> {
    return {
        id: record.Id,
        docNumber: record.DocNumber,
        customerId: record.CustomerRef?.value,
        customerName: record.CustomerRef?.name,
        balance: record.Balance?.toString(),
        totalAmt: record.TotalAmt?.toString(),
        lines: record.Line?.map((line) => ({
            id: line.Id,
            detailType: line.DetailType,
            description: line.Description,
            amount: line.Amount?.toString(),
            itemId: line.SalesItemLineDetail?.ItemRef?.value,
            itemName: line.SalesItemLineDetail?.ItemRef?.name
        })),
        createdAt: record.MetaData?.CreateTime,
        updatedAt: record.MetaData?.LastUpdatedTime
    };
}

const sync = createSync({
    description: 'Sync invoices from QuickBooks Online',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceModelSchema
    },
    endpoints: [
        {
            path: '/syncs/invoices',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        const realmId = await getRealmId(nango);

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpoint != null && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // CDC does not support offset pagination — use a single get call
            // API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-entities-cdc
            const cdcResponse = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: { entities: 'Invoice', changedSince: checkpoint.updated_after },
                headers: { 'Content-Type': 'text/plain' },
                retries: 3
            });
            const cdcRecords: unknown[] = cdcResponse.data?.CDCResponse?.[0]?.QueryResponse?.[0]?.Invoice ?? [];
            const parsedRecords = z.array(InvoiceSchema).safeParse(cdcRecords);
            if (!parsedRecords.success) {
                throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
            }

            const validRecords = parsedRecords.data;
            const active = validRecords.filter((r) => r.status !== 'Deleted' && r.status !== 'Voided');
            const deleted = validRecords.filter((r) => r.status === 'Deleted' || r.status === 'Voided');
            if (active.length > 0) {
                await nango.batchSave(active.map(toInvoice), 'Invoice');
            }
            if (checkpoint != null && deleted.length > 0) {
                await nango.batchDelete(
                    deleted.map((r) => ({ id: r.Id })),
                    'Invoice'
                );
            }
            const latest = validRecords.reduce((max, r) => {
                const updated = r.MetaData?.LastUpdatedTime;
                return updated && updated > max ? updated : max;
            }, '');
            if (latest) {
                await nango.saveCheckpoint({ updated_after: latest });
            }
        } else {
            // API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/Invoice
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint != null && checkpoint.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Invoice${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = ResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse response: ${JSON.stringify(parsed.error)}`);
                }

                const results = parsed.data.QueryResponse?.Invoice ?? [];

                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.status !== 'Deleted' && r.status !== 'Voided');
                const deleted = results.filter((r) => r.status === 'Deleted' || r.status === 'Voided');

                if (active.length > 0) {
                    await nango.batchSave(active.map(toInvoice), 'Invoice');
                }
                if (checkpoint != null && deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Invoice'
                    );
                }

                const pageLatest = results.reduce((max, r) => {
                    const updated = r.MetaData?.LastUpdatedTime;
                    return updated && updated > max ? updated : max;
                }, '');
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
