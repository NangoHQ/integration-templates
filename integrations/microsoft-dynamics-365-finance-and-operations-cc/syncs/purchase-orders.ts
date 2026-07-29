import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const PurchaseOrderSchema = z
    .object({
        id: z.string(),
        dataAreaId: z.string(),
        PurchaseOrderNumber: z.string(),
        PurchaseOrderName: z.string().optional(),
        PurchaseOrderStatus: z.string().optional(),
        OrderVendorAccountNumber: z.string().optional(),
        InvoiceVendorAccountNumber: z.string().optional(),
        VendorOrderReference: z.string().optional(),
        CurrencyCode: z.string().optional(),
        PaymentTermsName: z.string().optional(),
        VendorPaymentMethodName: z.string().optional(),
        VendorPostingProfileId: z.string().optional(),
        BuyerGroupId: z.string().optional(),
        ContactPersonId: z.string().optional(),
        ReasonCode: z.string().optional(),
        ReasonComment: z.string().optional(),
        RequestedDeliveryDate: z.string().optional(),
        ConfirmedDeliveryDate: z.string().optional(),
        AccountingDate: z.string().optional(),
        ArePricesIncludingSalesTax: z.string().optional(),
        DefaultReceivingSiteId: z.string().optional(),
        DefaultReceivingWarehouseId: z.string().optional(),
        DeliveryModeId: z.string().optional(),
        DeliveryTermsId: z.string().optional(),
        DocumentApprovalStatus: z.string().optional(),
        ProjectId: z.string().optional(),
        LanguageId: z.string().optional(),
        AttentionInformation: z.string().optional(),
        URL: z.string().optional(),
        Email: z.string().optional(),
        IsOneTimeVendor: z.string().optional(),
        IsDeliveredDirectly: z.string().optional(),
        IsChangeManagementActive: z.string().optional(),
        CashDiscountCode: z.string().optional(),
        NumberSequenceGroupId: z.string().optional(),
        PurchaseOrderPoolId: z.string().optional(),
        SalesTaxGroupCode: z.string().optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync purchase order headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },

    exec: async (nango) => {
        // Blocker: PurchaseOrderHeadersV2 exposes no filterable modified timestamp
        // in this environment, so full refresh is required. Persist the current
        // $skip offset so a long crawl can resume inside the same delete window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        if (!trackingStarted) {
            await nango.trackDeletesStart('PurchaseOrder');
            trackingStarted = true;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderHeadersV2',
            params: {
                $orderby: 'dataAreaId asc,PurchaseOrderNumber asc'
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
            const records = page.map((raw) => {
                const parsed = z
                    .object({
                        dataAreaId: z.string(),
                        PurchaseOrderNumber: z.string()
                    })
                    .passthrough()
                    .parse(raw);

                return {
                    id: `${parsed.dataAreaId}-${parsed.PurchaseOrderNumber}`,
                    ...parsed
                };
            });

            if (records.length > 0) {
                const validated = records.map((record) => PurchaseOrderSchema.parse(record));
                await nango.batchSave(validated, 'PurchaseOrder');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('PurchaseOrder');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
