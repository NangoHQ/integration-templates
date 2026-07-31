import { createSync } from 'nango';
import { z } from 'zod';

const OptionalUnknown = z.unknown().optional().nullable();

const ProviderPurchaseOrderLineSchema = z.object({
    dataAreaId: z.string(),
    PurchaseOrderNumber: z.string(),
    LineNumber: z.union([z.string(), z.number()]),
    ItemNumber: OptionalUnknown,
    OrderedPurchaseQuantity: OptionalUnknown,
    PurchaseUnit: OptionalUnknown,
    PurchasePrice: OptionalUnknown,
    CurrencyCode: OptionalUnknown,
    LineAmount: OptionalUnknown,
    LineStatus: OptionalUnknown,
    RequestedReceiptDate: OptionalUnknown,
    ExpectedReceiptDate: OptionalUnknown,
    ReceivingSiteId: OptionalUnknown,
    ReceivingWarehouseId: OptionalUnknown,
    VendorAccountNumber: OptionalUnknown,
    LineDescription: OptionalUnknown,
    LineDiscountAmount: OptionalUnknown,
    LineDiscountPercentage: OptionalUnknown
});

const PurchaseOrderLineSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    PurchaseOrderNumber: z.string(),
    LineNumber: z.number(),
    ItemNumber: z.string().optional(),
    OrderedPurchaseQuantity: z.number().optional(),
    PurchaseUnit: z.string().optional(),
    PurchasePrice: z.number().optional(),
    CurrencyCode: z.string().optional(),
    LineAmount: z.number().optional(),
    LineStatus: z.string().optional(),
    RequestedReceiptDate: z.string().optional(),
    ExpectedReceiptDate: z.string().optional(),
    ReceivingSiteId: z.string().optional(),
    ReceivingWarehouseId: z.string().optional(),
    VendorAccountNumber: z.string().optional(),
    LineDescription: z.string().optional(),
    LineDiscountAmount: z.number().optional(),
    LineDiscountPercentage: z.number().optional()
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
    const record = ProviderPurchaseOrderLineSchema.parse(raw);
    const lineNumber = toNumber(record.LineNumber);
    if (lineNumber === undefined || Number.isNaN(lineNumber)) {
        throw new Error(`Invalid LineNumber for purchase order ${record.PurchaseOrderNumber} in company ${record.dataAreaId}`);
    }

    return {
        id: `${record.dataAreaId}-${record.PurchaseOrderNumber}-${lineNumber}`,
        dataAreaId: record.dataAreaId,
        PurchaseOrderNumber: record.PurchaseOrderNumber,
        LineNumber: lineNumber,
        ItemNumber: toString(record.ItemNumber),
        OrderedPurchaseQuantity: toNumber(record.OrderedPurchaseQuantity),
        PurchaseUnit: toString(record.PurchaseUnit),
        PurchasePrice: toNumber(record.PurchasePrice),
        CurrencyCode: toString(record.CurrencyCode),
        LineAmount: toNumber(record.LineAmount),
        LineStatus: toString(record.LineStatus),
        RequestedReceiptDate: toString(record.RequestedReceiptDate),
        ExpectedReceiptDate: toString(record.ExpectedReceiptDate),
        ReceivingSiteId: toString(record.ReceivingSiteId),
        ReceivingWarehouseId: toString(record.ReceivingWarehouseId),
        VendorAccountNumber: toString(record.VendorAccountNumber),
        LineDescription: toString(record.LineDescription),
        LineDiscountAmount: toNumber(record.LineDiscountAmount),
        LineDiscountPercentage: toNumber(record.LineDiscountPercentage)
    };
}

const sync = createSync({
    description: 'Sync purchase order lines.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrderLine: PurchaseOrderLineSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        // skip can only be > 0 if an earlier execution already fetched at least one page, which
        // means that earlier execution must have already called trackDeletesStart. On a resumed
        // execution we must NOT call trackDeletesStart again — that would open a fresh window
        // covering only the remaining pages, and trackDeletesEnd would then treat every line
        // from the already-processed pages as missing and delete it.
        let trackingStarted = skip > 0;

        const ODataResponseSchema = z.object({
            value: z.array(z.unknown())
        });

        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            const response = await nango.get({
                endpoint: '/data/PurchaseOrderLinesV2',
                params: {
                    $top: limit,
                    $skip: skip,
                    'cross-company': 'true',
                    $orderby: 'dataAreaId asc,PurchaseOrderNumber asc,LineNumber asc'
                },
                retries: 3
            });

            const envelope = ODataResponseSchema.parse(response.data);

            if (!trackingStarted) {
                await nango.trackDeletesStart('PurchaseOrderLine');
                trackingStarted = true;
            }

            const lines = envelope.value.map(mapLine);

            if (lines.length > 0) {
                await nango.batchSave(lines, 'PurchaseOrderLine');
            }

            skip += envelope.value.length;
            await nango.saveCheckpoint({ skip });

            if (envelope.value.length < limit) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('PurchaseOrderLine');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
