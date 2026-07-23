import { createSync } from 'nango';
import { z } from 'zod';

const OptionalUnknown = z.unknown().optional().nullable();

const ProviderSalesOrderLineSchema = z.object({
    dataAreaId: z.string(),
    SalesOrderNumber: z.string(),
    LineNumber: z.union([z.string(), z.number()]),
    ItemNumber: OptionalUnknown,
    OrderedSalesQuantity: OptionalUnknown,
    SalesUnitSymbol: OptionalUnknown,
    SalesPrice: OptionalUnknown,
    CurrencyCode: OptionalUnknown,
    LineAmount: OptionalUnknown,
    NetAmount: OptionalUnknown,
    SalesOrderLineStatus: OptionalUnknown,
    RequestedShippingDate: OptionalUnknown,
    RequestedReceiptDate: OptionalUnknown,
    ShippingWarehouseId: OptionalUnknown,
    ShippingSiteId: OptionalUnknown,
    CustomerAccount: OptionalUnknown,
    LineDiscountAmount: OptionalUnknown,
    LineDiscountPercentage: OptionalUnknown,
    ProductConfigurationId: OptionalUnknown,
    ProductColorId: OptionalUnknown,
    ProductSizeId: OptionalUnknown,
    ProductStyleId: OptionalUnknown,
    ProductVersionId: OptionalUnknown,
    LineDescription: OptionalUnknown
});

const SalesOrderLineSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    salesOrderNumber: z.string(),
    lineNumber: z.number(),
    itemNumber: z.string().optional(),
    orderedSalesQuantity: z.number().optional(),
    salesUnitSymbol: z.string().optional(),
    salesPrice: z.number().optional(),
    currencyCode: z.string().optional(),
    lineAmount: z.number().optional(),
    netAmount: z.number().optional(),
    salesOrderLineStatus: z.string().optional(),
    requestedShippingDate: z.string().optional(),
    requestedReceiptDate: z.string().optional(),
    shippingWarehouseId: z.string().optional(),
    shippingSiteId: z.string().optional(),
    customerAccount: z.string().optional(),
    lineDiscountAmount: z.number().optional(),
    lineDiscountPercentage: z.number().optional(),
    productConfigurationId: z.string().optional(),
    productColorId: z.string().optional(),
    productSizeId: z.string().optional(),
    productStyleId: z.string().optional(),
    productVersionId: z.string().optional(),
    lineDescription: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const n = Number(value);
        if (!Number.isNaN(n)) {
            return n;
        }
    }
    return undefined;
}

function toString(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}

function mapLine(raw: unknown) {
    const record = ProviderSalesOrderLineSchema.parse(raw);
    const lineNumber = toNumber(record.LineNumber);
    if (lineNumber === undefined || Number.isNaN(lineNumber)) {
        throw new Error(`Invalid LineNumber for sales order ${record.SalesOrderNumber} in company ${record.dataAreaId}`);
    }

    return {
        id: `${record.dataAreaId}-${record.SalesOrderNumber}-${lineNumber}`,
        dataAreaId: record.dataAreaId,
        salesOrderNumber: record.SalesOrderNumber,
        lineNumber,
        itemNumber: toString(record.ItemNumber),
        orderedSalesQuantity: toNumber(record.OrderedSalesQuantity),
        salesUnitSymbol: toString(record.SalesUnitSymbol),
        salesPrice: toNumber(record.SalesPrice),
        currencyCode: toString(record.CurrencyCode),
        lineAmount: toNumber(record.LineAmount),
        netAmount: toNumber(record.NetAmount),
        salesOrderLineStatus: toString(record.SalesOrderLineStatus),
        requestedShippingDate: toString(record.RequestedShippingDate),
        requestedReceiptDate: toString(record.RequestedReceiptDate),
        shippingWarehouseId: toString(record.ShippingWarehouseId),
        shippingSiteId: toString(record.ShippingSiteId),
        customerAccount: toString(record.CustomerAccount),
        lineDiscountAmount: toNumber(record.LineDiscountAmount),
        lineDiscountPercentage: toNumber(record.LineDiscountPercentage),
        productConfigurationId: toString(record.ProductConfigurationId),
        productColorId: toString(record.ProductColorId),
        productSizeId: toString(record.ProductSizeId),
        productStyleId: toString(record.ProductStyleId),
        productVersionId: toString(record.ProductVersionId),
        lineDescription: toString(record.LineDescription)
    };
}

const sync = createSync({
    description: 'Sync sales order lines.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SalesOrderLine: SalesOrderLineSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        // trackDeletesStart is called once the very next page (fresh or resumed) has been
        // fetched and validated below — on every execution, not just when skip === 0 — so a
        // resumed execution still (re-)opens the delete-tracking window, and a failed/invalid
        // page never leaves tracking "started" with nothing validated. Safe/idempotent to call
        // again if a prior execution already started it while the window is open.
        let shouldStartTracking = true;

        const ODataResponseSchema = z.object({
            value: z.array(z.unknown())
        });

        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            const response = await nango.get({
                endpoint: '/data/SalesOrderLinesV3',
                params: {
                    $top: limit,
                    $skip: skip,
                    'cross-company': 'true',
                    $orderby: 'dataAreaId asc,SalesOrderNumber asc,LineNumber asc'
                },
                retries: 3
            });

            const envelope = ODataResponseSchema.parse(response.data);
            const lines = envelope.value.map(mapLine);

            if (shouldStartTracking) {
                await nango.trackDeletesStart('SalesOrderLine');
                shouldStartTracking = false;
            }

            if (lines.length > 0) {
                await nango.batchSave(lines, 'SalesOrderLine');
            }

            skip += envelope.value.length;
            await nango.saveCheckpoint({ skip });

            if (envelope.value.length < limit) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SalesOrderLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
