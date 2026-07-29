import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSalesOrderLineSchema = z
    .object({
        dataAreaId: z.string(),
        SalesOrderNumber: z.string(),
        LineNumber: z.union([z.string(), z.number()]),
        ItemNumber: z.string().optional().nullable(),
        ProductConfigurationId: z.string().optional().nullable(),
        ProductSizeId: z.string().optional().nullable(),
        ProductColorId: z.string().optional().nullable(),
        ProductStyleId: z.string().optional().nullable(),
        ProductVersionId: z.string().optional().nullable(),
        ShippingWarehouseId: z.string().optional().nullable(),
        ShippingSiteId: z.string().optional().nullable(),
        OrderedInventoryQuantity: z.union([z.string(), z.number()]).optional().nullable(),
        SalesPrice: z.union([z.string(), z.number()]).optional().nullable(),
        SalesUnit: z.string().optional().nullable(),
        LineAmount: z.union([z.string(), z.number()]).optional().nullable(),
        RequestedReceiptDate: z.string().optional().nullable(),
        RequestedShipDate: z.string().optional().nullable(),
        CustomerLineNumber: z.string().optional().nullable(),
        SalesStatus: z.string().optional().nullable()
    })
    .passthrough();

const SalesOrderLineSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    salesOrderNumber: z.string(),
    lineNumber: z.string(),
    itemNumber: z.string().optional(),
    productConfigurationId: z.string().optional(),
    productSizeId: z.string().optional(),
    productColorId: z.string().optional(),
    productStyleId: z.string().optional(),
    productVersionId: z.string().optional(),
    shippingWarehouseId: z.string().optional(),
    shippingSiteId: z.string().optional(),
    orderedInventoryQuantity: z.union([z.string(), z.number()]).optional(),
    salesPrice: z.union([z.string(), z.number()]).optional(),
    salesUnit: z.string().optional(),
    lineAmount: z.union([z.string(), z.number()]).optional(),
    requestedReceiptDate: z.string().optional(),
    requestedShipDate: z.string().optional(),
    customerLineNumber: z.string().optional(),
    salesStatus: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

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
        // Blocker: SalesOrderLinesV3 does not expose a filterable modified-timestamp
        // in this D365 FO environment, so incremental checkpoints are not viable.
        // We still persist the current $skip offset so an interrupted full crawl
        // can resume inside the same delete-tracking window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        if (!trackingStarted) {
            await nango.trackDeletesStart('SalesOrderLine');
            trackingStarted = true;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderLinesV3',
            params: {
                $orderby: 'dataAreaId asc,SalesOrderNumber asc,LineNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderSalesOrderLineSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse sales order lines: ${parsed.error.message}`);
            }

            const lines = parsed.data.map((record) => ({
                id: `${record.dataAreaId}-${record.SalesOrderNumber}-${record.LineNumber}`,
                dataAreaId: record.dataAreaId,
                salesOrderNumber: record.SalesOrderNumber,
                lineNumber: String(record.LineNumber),
                ...(record.ItemNumber != null && { itemNumber: record.ItemNumber }),
                ...(record.ProductConfigurationId != null && { productConfigurationId: record.ProductConfigurationId }),
                ...(record.ProductSizeId != null && { productSizeId: record.ProductSizeId }),
                ...(record.ProductColorId != null && { productColorId: record.ProductColorId }),
                ...(record.ProductStyleId != null && { productStyleId: record.ProductStyleId }),
                ...(record.ProductVersionId != null && { productVersionId: record.ProductVersionId }),
                ...(record.ShippingWarehouseId != null && { shippingWarehouseId: record.ShippingWarehouseId }),
                ...(record.ShippingSiteId != null && { shippingSiteId: record.ShippingSiteId }),
                ...(record.OrderedInventoryQuantity != null && { orderedInventoryQuantity: record.OrderedInventoryQuantity }),
                ...(record.SalesPrice != null && { salesPrice: record.SalesPrice }),
                ...(record.SalesUnit != null && { salesUnit: record.SalesUnit }),
                ...(record.LineAmount != null && { lineAmount: record.LineAmount }),
                ...(record.RequestedReceiptDate != null && { requestedReceiptDate: record.RequestedReceiptDate }),
                ...(record.RequestedShipDate != null && { requestedShipDate: record.RequestedShipDate }),
                ...(record.CustomerLineNumber != null && { customerLineNumber: record.CustomerLineNumber }),
                ...(record.SalesStatus != null && { salesStatus: record.SalesStatus })
            }));

            if (lines.length > 0) {
                await nango.batchSave(lines, 'SalesOrderLine');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('SalesOrderLine');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
