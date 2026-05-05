import { createSync, NangoSync } from 'nango';
import { z } from 'zod';

// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item
const ItemSchema = z.object({
    Id: z.string(),
    Name: z.string().optional(),
    Description: z.string().optional(),
    Active: z.boolean().optional(),
    status: z.string().optional(),
    Type: z.enum(['Inventory', 'NonInventory', 'Service', 'Group', 'Category']).optional(),
    IncomeAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    ExpenseAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    AssetAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    UnitPrice: z.number().optional(),
    PurchaseCost: z.number().optional(),
    QtyOnHand: z.number().optional(),
    InvStartDate: z.string().optional(),
    Taxable: z.boolean().optional(),
    SalesTaxCodeRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    PurchaseTaxCodeRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    TrackQtyOnHand: z.boolean().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string()
        })
        .optional()
});

const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        Item: z.array(ItemSchema).optional()
    })
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type ItemType = z.infer<typeof ItemSchema>;

async function getCompany(nango: NangoSync): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toItem(raw: ItemType) {
    return {
        id: raw.Id,
        name: raw.Name,
        description: raw.Description,
        active: raw.Active,
        type: raw.Type,
        incomeAccountId: raw.IncomeAccountRef?.value,
        incomeAccountName: raw.IncomeAccountRef?.name,
        expenseAccountId: raw.ExpenseAccountRef?.value,
        expenseAccountName: raw.ExpenseAccountRef?.name,
        assetAccountId: raw.AssetAccountRef?.value,
        assetAccountName: raw.AssetAccountRef?.name,
        unitPrice: raw.UnitPrice,
        purchaseCost: raw.PurchaseCost,
        qtyOnHand: raw.QtyOnHand,
        invStartDate: raw.InvStartDate,
        taxable: raw.Taxable,
        salesTaxCodeId: raw.SalesTaxCodeRef?.value,
        salesTaxCodeName: raw.SalesTaxCodeRef?.name,
        purchaseTaxCodeId: raw.PurchaseTaxCodeRef?.value,
        purchaseTaxCodeName: raw.PurchaseTaxCodeRef?.name,
        trackQtyOnHand: raw.TrackQtyOnHand,
        createdAt: raw.MetaData?.CreateTime,
        updatedAt: raw.MetaData?.LastUpdatedTime
    };
}

const ItemModel = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    type: z.enum(['Inventory', 'NonInventory', 'Service', 'Group', 'Category']).optional(),
    incomeAccountId: z.string().optional(),
    incomeAccountName: z.string().optional(),
    expenseAccountId: z.string().optional(),
    expenseAccountName: z.string().optional(),
    assetAccountId: z.string().optional(),
    assetAccountName: z.string().optional(),
    unitPrice: z.number().optional(),
    purchaseCost: z.number().optional(),
    qtyOnHand: z.number().optional(),
    invStartDate: z.string().optional(),
    taxable: z.boolean().optional(),
    salesTaxCodeId: z.string().optional(),
    salesTaxCodeName: z.string().optional(),
    purchaseTaxCodeId: z.string().optional(),
    purchaseTaxCodeName: z.string().optional(),
    trackQtyOnHand: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

type SyncModels = {
    Item: typeof ItemModel;
};

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync<SyncModels, never, typeof CheckpointSchema>({
    endpoints: [{ path: '/syncs/items', method: 'POST' }],
    description: 'Sync product and service items from QuickBooks Online',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemModel
    },

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const checkpoint: Checkpoint | null = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const updatedAfter = checkpoint?.updated_after ?? '';
        const useIncremental = updatedAfter !== '' && new Date(updatedAfter) > cutoff;

        if (useIncremental) {
            // CDC does not support offset pagination — use a single get call
            const cdcResponse = await nango.get({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: { entities: 'Item', changedSince: updatedAfter },
                headers: { 'Content-Type': 'text/plain' },
                retries: 3
            });
            const cdcRecords: unknown[] = cdcResponse.data?.CDCResponse?.[0]?.QueryResponse?.[0]?.Item ?? [];
            const parsedRecords = z.array(ItemSchema).safeParse(cdcRecords);
            if (!parsedRecords.success) {
                throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
            }

            const validRecords = parsedRecords.data;
            const active = validRecords.filter((r) => r.Active !== false && r.status !== 'Deleted');
            const deleted = validRecords.filter((r) => r.Active === false || r.status === 'Deleted');

            if (active.length > 0) {
                await nango.batchSave(active.map(toItem), 'Item');
            }
            if (deleted.length > 0) {
                await nango.batchDelete(
                    deleted.map((r) => ({ id: r.Id })),
                    'Item'
                );
            }

            const latest = validRecords.reduce((max, r) => {
                const time = r.MetaData?.LastUpdatedTime;
                return time && time > max ? time : max;
            }, '');
            if (latest) {
                await nango.saveCheckpoint({ updated_after: latest });
            }
        } else {
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Item${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item#query-an-item
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = QueryResponseSchema.parse(response.data);
                const results = parsed.QueryResponse.Item ?? [];

                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.Active !== false && r.status !== 'Deleted');
                const inactive = results.filter((r) => r.Active === false || r.status === 'Deleted');

                if (active.length > 0) {
                    await nango.batchSave(active.map(toItem), 'Item');
                }

                if (inactive.length > 0 && checkpoint) {
                    await nango.batchDelete(
                        inactive.map((r) => ({ id: r.Id })),
                        'Item'
                    );
                }

                const pageLatest = results.reduce((max, r) => {
                    const time = r.MetaData?.LastUpdatedTime;
                    return time && time > max ? time : max;
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
