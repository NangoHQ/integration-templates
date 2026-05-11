import { createSync } from 'nango';
import { z } from 'zod';

const EstimateSchema = z.object({
    id: z.string(),
    estimate_id: z.string(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    transaction_date: z.string().optional(),
    expiration_date: z.string().optional(),
    total_amount: z.number().optional(),
    status: z.string().optional(),
    doc_number: z.string().optional(),
    private_note: z.string().optional(),
    sales_term_id: z.string().optional(),
    bill_email: z.string().optional(),
    ship_method: z.string().optional(),
    ship_date: z.string().optional(),
    tracking_num: z.string().optional(),
    class_id: z.string().optional(),
    department_id: z.string().optional(),
    sales_rep_id: z.string().optional(),
    tax_code_id: z.string().optional(),
    billing_address: z.record(z.string(), z.unknown()).optional(),
    shipping_address: z.record(z.string(), z.unknown()).optional(),
    line_items: z.array(z.record(z.string(), z.unknown())).optional(),
    last_updated_time: z.string()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const EstimateLineSchema = z.record(z.string(), z.unknown());

const AddressSchema = z.record(z.string(), z.unknown());

const CustomerRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const OptionalRefSchema = z
    .object({
        value: z.string(),
        name: z.string().optional()
    })
    .optional();

const ProviderEstimateSchema = z.intersection(
    z.record(z.string(), z.unknown()),
    z.object({
        Id: z.string(),
        MetaData: MetaDataSchema.optional(),
        status: z.string().optional(),
        domain: z.string().optional(),
        sparse: z.boolean().optional(),
        CustomField: z.array(z.record(z.string(), z.unknown())).optional(),
        DocNumber: z.string().optional(),
        TxnDate: z.string().optional(),
        ExpirationDate: z.string().optional(),
        TxnStatus: z.string().optional(),
        CustomerRef: CustomerRefSchema.optional(),
        CustomerMemo: z.object({ value: z.string() }).optional(),
        BillAddr: AddressSchema.optional(),
        ShipAddr: AddressSchema.optional(),
        ClassRef: OptionalRefSchema,
        DepartmentRef: OptionalRefSchema,
        SalesRepRef: OptionalRefSchema,
        SalesTermRef: OptionalRefSchema,
        ShipMethodRef: OptionalRefSchema,
        ShipDate: z.string().optional(),
        TrackingNum: z.string().optional(),
        BillEmail: z.object({ Address: z.string() }).optional(),
        TotalAmt: z.number().optional(),
        ApplyTaxAfterDiscount: z.boolean().optional(),
        PrintStatus: z.string().optional(),
        EmailStatus: z.string().optional(),
        PrivateNote: z.string().optional(),
        CustomerTaxCodeRef: OptionalRefSchema,
        TaxCodeRef: OptionalRefSchema,
        Line: z.array(EstimateLineSchema).optional(),
        TaxDetail: z.record(z.string(), z.unknown()).optional(),
        RecurDataRef: z.record(z.string(), z.unknown()).optional(),
        ExchRateInfo: z.record(z.string(), z.unknown()).optional()
    })
);

const QueryResponseSchema = z.object({
    Estimate: z.array(ProviderEstimateSchema).optional(),
    startPosition: z.union([z.string(), z.number()]).optional(),
    maxResults: z.union([z.string(), z.number()]).optional(),
    totalCount: z.union([z.string(), z.number()]).optional()
});

const ResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

async function getCompany(nango: {
    getConnection: () => Promise<{
        connection_config: Record<string, unknown>;
    }>;
}): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toEstimate(record: z.infer<typeof ProviderEstimateSchema>): z.infer<typeof EstimateSchema> {
    const customerRef = record.CustomerRef;
    const salesTermRef = record.SalesTermRef;
    const shipMethodRef = record.ShipMethodRef;
    const classRef = record.ClassRef;
    const departmentRef = record.DepartmentRef;
    const salesRepRef = record.SalesRepRef;
    const taxCodeRef = record.TaxCodeRef;
    const customerTaxCodeRef = record.CustomerTaxCodeRef;
    const billEmail = record.BillEmail;
    const metaData = record.MetaData;

    return {
        id: record.Id,
        estimate_id: record.Id,
        customer_id: customerRef?.value,
        customer_name: customerRef?.name,
        transaction_date: record.TxnDate,
        expiration_date: record.ExpirationDate,
        total_amount: record.TotalAmt,
        status: record.TxnStatus,
        doc_number: record.DocNumber,
        private_note: record.PrivateNote,
        sales_term_id: salesTermRef?.value,
        bill_email: billEmail?.Address,
        ship_method: shipMethodRef?.name,
        ship_date: record.ShipDate,
        tracking_num: record.TrackingNum,
        class_id: classRef?.value,
        department_id: departmentRef?.value,
        sales_rep_id: salesRepRef?.value,
        tax_code_id: taxCodeRef?.value || customerTaxCodeRef?.value,
        billing_address: record.BillAddr,
        shipping_address: record.ShipAddr,
        line_items: record.Line,
        last_updated_time: metaData?.LastUpdatedTime ?? ''
    };
}

const sync = createSync({
    description: 'Sync customer estimates from QuickBooks Online.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/estimates' }],
    models: {
        Estimate: EstimateSchema
    },

    exec: async (nango) => {
        const realmId = await getCompany(nango);
        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const hasCheckpoint =
            checkpoint !== null && typeof checkpoint === 'object' && 'updated_after' in checkpoint && typeof checkpoint.updated_after === 'string';
        const useIncremental = hasCheckpoint && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate#the-change-data-capture-cdc-operation
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
                    entities: 'Estimate',
                    changedSince: checkpoint.updated_after
                },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Estimate',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };
            for await (const records of nango.paginate(proxyConfig)) {
                const parsedRecords = z.array(ProviderEstimateSchema).safeParse(records);
                if (!parsedRecords.success) {
                    throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
                }

                const estimates = parsedRecords.data;
                const active = estimates.filter((r) => r.status !== 'Deleted');
                const deleted = estimates.filter((r) => r.status === 'Deleted');
                if (active.length > 0) {
                    await nango.batchSave(active.map(toEstimate), 'Estimate');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Estimate'
                    );
                }
                const latest = estimates.reduce((max, r) => {
                    const lastUpdated = r.MetaData?.LastUpdatedTime;
                    return lastUpdated && lastUpdated > max ? lastUpdated : max;
                }, '');
                if (latest) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            // Full sync using query endpoint
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';
            const updatedAfterFilter = hasCheckpoint && typeof checkpoint.updated_after === 'string' ? checkpoint.updated_after : '';
            while (true) {
                const filter = updatedAfterFilter ? ` WHERE MetaData.LastUpdatedTime > '${updatedAfterFilter}'` : '';
                const query = `SELECT * FROM Estimate${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });
                const parsed = ResponseSchema.parse(response.data);
                const results = parsed.QueryResponse.Estimate ?? [];
                if (results.length === 0) {
                    break;
                }
                const mapped = results.map(toEstimate);
                await nango.batchSave(mapped, 'Estimate');
                const pageLatest = results.reduce((max, r) => {
                    const lastUpdated = r.MetaData?.LastUpdatedTime;
                    return lastUpdated && lastUpdated > max ? lastUpdated : max;
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
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
