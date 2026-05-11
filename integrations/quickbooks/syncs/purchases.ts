import { createSync } from 'nango';
import { z } from 'zod';

// Helper to resolve realmId from connection config
async function getCompany(nango: Parameters<ReturnType<typeof createSync>['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

// QuickBooks Purchase API response schemas - based on
// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase
const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const CurrencyRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const AccountRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const VendorRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const CustomerRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const DepartmentRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const ItemRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const TaxCodeRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const AccountBasedExpenseLineDetailSchema = z.object({
    AccountRef: AccountRefSchema.optional(),
    TaxAmount: z.number().optional(),
    TaxInclusiveAmount: z.number().optional(),
    TaxCodeRef: TaxCodeRefSchema.optional(),
    BillableStatus: z.string().optional(),
    CustomerRef: CustomerRefSchema.optional(),
    DepartmentRef: DepartmentRefSchema.optional()
});

const ItemBasedExpenseLineDetailSchema = z.object({
    ItemRef: ItemRefSchema.optional(),
    UnitPrice: z.number().optional(),
    Qty: z.number().optional(),
    TaxCodeRef: TaxCodeRefSchema.optional(),
    TaxAmount: z.number().optional(),
    BillableStatus: z.string().optional(),
    CustomerRef: CustomerRefSchema.optional(),
    DepartmentRef: DepartmentRefSchema.optional()
});

const PurchaseLineSchema = z.object({
    Id: z.string().optional(),
    LineNum: z.string().optional(),
    Description: z.string().optional(),
    Amount: z.number().optional(),
    DetailType: z.string().optional(),
    AccountBasedExpenseLineDetail: AccountBasedExpenseLineDetailSchema.optional(),
    ItemBasedExpenseLineDetail: ItemBasedExpenseLineDetailSchema.optional()
});

const PurchaseSchema = z.object({
    Id: z.string(),
    status: z.string().optional(),
    domain: z.string().optional(),
    MetaData: MetaDataSchema.optional(),
    DocNumber: z.string().optional(),
    TxnDate: z.string().optional(),
    CurrencyRef: CurrencyRefSchema.optional(),
    ExchangeRate: z.number().optional(),
    PrivateNote: z.string().optional(),
    PaymentType: z.string().optional(),
    AccountRef: AccountRefSchema.optional(),
    EntityRef: z.union([VendorRefSchema, CustomerRefSchema]).optional(),
    Credit: z.boolean().optional(),
    TotalAmt: z.number().optional(),
    DepartmentRef: DepartmentRefSchema.optional(),
    IncludeInAnnualTPAR: z.boolean().optional(),
    Line: z.array(PurchaseLineSchema).optional()
});

const QueryResponseSchema = z.object({
    Purchase: z.array(PurchaseSchema).optional(),
    startPosition: z.number().optional(),
    maxResults: z.number().optional(),
    totalCount: z.number().optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

// Nango model schemas
const PurchaseLineModelSchema = z.object({
    id: z.string().optional(),
    line_num: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    detail_type: z.string().optional(),
    account_ref_value: z.string().optional(),
    account_ref_name: z.string().optional(),
    item_ref_value: z.string().optional(),
    item_ref_name: z.string().optional(),
    unit_price: z.number().optional(),
    quantity: z.number().optional(),
    tax_amount: z.number().optional(),
    billable_status: z.string().optional()
});

const PurchaseModelSchema = z.object({
    id: z.string(),
    doc_number: z.string().optional(),
    txn_date: z.string().optional(),
    total_amount: z.number().optional(),
    payment_type: z.string().optional(),
    private_note: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    credit: z.boolean().optional(),
    department_id: z.string().optional(),
    department_name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    lines: z.array(PurchaseLineModelSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

function toPurchaseLine(line: z.infer<typeof PurchaseLineSchema>): z.infer<typeof PurchaseLineModelSchema> {
    const result: z.infer<typeof PurchaseLineModelSchema> = {};

    if (line.Id) {
        result.id = line.Id;
    }
    if (line.LineNum) {
        result.line_num = line.LineNum;
    }
    if (line.Description) {
        result.description = line.Description;
    }
    if (line.Amount !== undefined) {
        result.amount = line.Amount;
    }
    if (line.DetailType) {
        result.detail_type = line.DetailType;
    }

    if (line.AccountBasedExpenseLineDetail) {
        const detail = line.AccountBasedExpenseLineDetail;
        if (detail.AccountRef) {
            if (detail.AccountRef.value) {
                result.account_ref_value = detail.AccountRef.value;
            }
            if (detail.AccountRef.name) {
                result.account_ref_name = detail.AccountRef.name;
            }
        }
        if (detail.TaxAmount !== undefined) {
            result.tax_amount = detail.TaxAmount;
        }
        if (detail.BillableStatus) {
            result.billable_status = detail.BillableStatus;
        }
    }

    if (line.ItemBasedExpenseLineDetail) {
        const detail = line.ItemBasedExpenseLineDetail;
        if (detail.ItemRef) {
            if (detail.ItemRef.value) {
                result.item_ref_value = detail.ItemRef.value;
            }
            if (detail.ItemRef.name) {
                result.item_ref_name = detail.ItemRef.name;
            }
        }
        if (detail.UnitPrice !== undefined) {
            result.unit_price = detail.UnitPrice;
        }
        if (detail.Qty !== undefined) {
            result.quantity = detail.Qty;
        }
        if (detail.TaxAmount !== undefined) {
            result.tax_amount = detail.TaxAmount;
        }
        if (detail.BillableStatus) {
            result.billable_status = detail.BillableStatus;
        }
    }

    return result;
}

function toPurchase(record: z.infer<typeof PurchaseSchema>): z.infer<typeof PurchaseModelSchema> {
    const result: z.infer<typeof PurchaseModelSchema> = {
        id: record.Id
    };

    if (record.DocNumber) {
        result.doc_number = record.DocNumber;
    }
    if (record.TxnDate) {
        result.txn_date = record.TxnDate;
    }
    if (record.TotalAmt !== undefined) {
        result.total_amount = record.TotalAmt;
    }
    if (record.PaymentType) {
        result.payment_type = record.PaymentType;
    }
    if (record.PrivateNote) {
        result.private_note = record.PrivateNote;
    }

    if (record.EntityRef) {
        if ('value' in record.EntityRef && record.EntityRef.value) {
            result.vendor_id = record.EntityRef.value;
        }
        if ('name' in record.EntityRef && record.EntityRef.name) {
            result.vendor_name = record.EntityRef.name;
        }
    }

    if (record.AccountRef) {
        if (record.AccountRef.value) {
            result.account_id = record.AccountRef.value;
        }
        if (record.AccountRef.name) {
            result.account_name = record.AccountRef.name;
        }
    }

    if (record.CurrencyRef) {
        if (record.CurrencyRef.value) {
            result.currency_code = record.CurrencyRef.value;
        }
    }

    if (record.ExchangeRate !== undefined) {
        result.exchange_rate = record.ExchangeRate;
    }
    if (record.Credit !== undefined) {
        result.credit = record.Credit;
    }

    if (record.DepartmentRef) {
        if (record.DepartmentRef.value) {
            result.department_id = record.DepartmentRef.value;
        }
        if (record.DepartmentRef.name) {
            result.department_name = record.DepartmentRef.name;
        }
    }

    if (record.MetaData) {
        if (record.MetaData.CreateTime) {
            result.created_at = record.MetaData.CreateTime;
        }
        if (record.MetaData.LastUpdatedTime) {
            result.updated_at = record.MetaData.LastUpdatedTime;
        }
    }

    if (record.Line && record.Line.length > 0) {
        result.lines = record.Line.map(toPurchaseLine);
    }

    return result;
}

// Validate checkpoint data using the schema
function validateCheckpoint(data: unknown): { updated_after: string } | null {
    const result = CheckpointSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    return null;
}

const sync = createSync({
    description: 'Sync QuickBooks purchase transactions',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/purchases',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Purchase: PurchaseModelSchema
    },

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = validateCheckpoint(rawCheckpoint);

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const updatedAfter = checkpoint?.updated_after ?? '';
        const useIncremental = updatedAfter !== '' && new Date(updatedAfter) > cutoff;

        if (useIncremental) {
            for await (const records of nango.paginate({
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: {
                    entities: 'Purchase',
                    changedSince: updatedAfter
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Purchase',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            })) {
                const parsedRecords = z.array(PurchaseSchema).safeParse(records);
                if (!parsedRecords.success) {
                    throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
                }

                const purchases = parsedRecords.data;
                const active = purchases.filter((r) => r.status !== 'Deleted');
                const deleted = purchases.filter((r) => r.status === 'Deleted');

                if (active.length > 0) {
                    await nango.batchSave(active.map(toPurchase), 'Purchase');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Purchase'
                    );
                }

                const latest = purchases.reduce((max, r) => {
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
                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Purchase${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = ResponseSchema.parse(response.data);
                const purchases = parsed.QueryResponse.Purchase ?? [];

                if (purchases.length === 0) {
                    break;
                }

                const active = purchases.filter((r) => r.status !== 'Deleted');
                const deleted = purchases.filter((r) => r.status === 'Deleted');

                if (active.length > 0) {
                    await nango.batchSave(active.map(toPurchase), 'Purchase');
                }
                if (checkpoint?.updated_after && deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Purchase'
                    );
                }

                const pageLatest = purchases.reduce((max, r) => {
                    const lastUpdated = r.MetaData?.LastUpdatedTime;
                    if (lastUpdated && lastUpdated > max) {
                        return lastUpdated;
                    }
                    return max;
                }, '');

                if (pageLatest && pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }

                if (latestUpdatedTime) {
                    await nango.saveCheckpoint({ updated_after: latestUpdatedTime });
                }

                if (purchases.length < maxResults) {
                    break;
                }

                startPosition += maxResults;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
