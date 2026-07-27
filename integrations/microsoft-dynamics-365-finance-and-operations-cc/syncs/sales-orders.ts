import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const ProviderSalesOrderSchema = z
    .object({
        dataAreaId: z.string(),
        SalesOrderNumber: z.string(),
        SalesOrderName: z.string().nullish(),
        SalesOrderStatus: z.string().nullish(),
        SalesOrderProcessingStatus: z.string().nullish(),
        OrderingCustomerAccountNumber: z.string().nullish(),
        InvoiceCustomerAccountNumber: z.string().nullish(),
        CurrencyCode: z.string().nullish(),
        OrderCreationDateTime: z.string().nullish(),
        RequestedShippingDate: z.string().nullish(),
        RequestedReceiptDate: z.string().nullish(),
        ConfirmedShippingDate: z.string().nullish(),
        ConfirmedReceiptDate: z.string().nullish(),
        URL: z.string().nullish(),
        Email: z.string().nullish(),
        OrderTotalAmount: z.number().nullish(),
        OrderTotalTaxAmount: z.number().nullish(),
        OrderTotalDiscountAmount: z.number().nullish(),
        OrderTotalChargesAmount: z.number().nullish(),
        TotalDiscountAmount: z.number().nullish(),
        TotalDiscountPercentage: z.number().nullish(),
        PaymentTermsName: z.string().nullish(),
        SalesTaxGroupCode: z.string().nullish(),
        CustomerPaymentMethodName: z.string().nullish(),
        CashDiscountCode: z.string().nullish(),
        DeliveryTermsCode: z.string().nullish(),
        DeliveryModeCode: z.string().nullish(),
        LanguageId: z.string().nullish(),
        QuotationNumber: z.string().nullish(),
        SalesOrderPoolId: z.string().nullish(),
        SalesOrderOriginCode: z.string().nullish(),
        NumberSequenceGroupId: z.string().nullish(),
        ProjectId: z.string().nullish(),
        CampaignId: z.string().nullish(),
        IsSalesProcessingStopped: z.string().nullish(),
        ArePricesIncludingSalesTax: z.string().nullish(),
        IsOneTimeCustomer: z.string().nullish(),
        IsDeliveryAddressOrderSpecific: z.string().nullish(),
        FixedExchangeRate: z.number().nullish(),
        ReportingCurrencyFixedExchangeRate: z.number().nullish()
    })
    .passthrough();

const SalesOrderSchema = z
    .object({
        id: z.string(),
        dataAreaId: z.string(),
        SalesOrderNumber: z.string(),
        SalesOrderName: z.string().optional(),
        SalesOrderStatus: z.string().optional(),
        SalesOrderProcessingStatus: z.string().optional(),
        OrderingCustomerAccountNumber: z.string().optional(),
        InvoiceCustomerAccountNumber: z.string().optional(),
        CurrencyCode: z.string().optional(),
        OrderCreationDateTime: z.string().optional(),
        RequestedShippingDate: z.string().optional(),
        RequestedReceiptDate: z.string().optional(),
        ConfirmedShippingDate: z.string().optional(),
        ConfirmedReceiptDate: z.string().optional(),
        URL: z.string().optional(),
        Email: z.string().optional(),
        OrderTotalAmount: z.number().optional(),
        OrderTotalTaxAmount: z.number().optional(),
        OrderTotalDiscountAmount: z.number().optional(),
        OrderTotalChargesAmount: z.number().optional(),
        TotalDiscountAmount: z.number().optional(),
        TotalDiscountPercentage: z.number().optional(),
        PaymentTermsName: z.string().optional(),
        SalesTaxGroupCode: z.string().optional(),
        CustomerPaymentMethodName: z.string().optional(),
        CashDiscountCode: z.string().optional(),
        DeliveryTermsCode: z.string().optional(),
        DeliveryModeCode: z.string().optional(),
        LanguageId: z.string().optional(),
        QuotationNumber: z.string().optional(),
        SalesOrderPoolId: z.string().optional(),
        SalesOrderOriginCode: z.string().optional(),
        NumberSequenceGroupId: z.string().optional(),
        ProjectId: z.string().optional(),
        CampaignId: z.string().optional(),
        IsSalesProcessingStopped: z.string().optional(),
        ArePricesIncludingSalesTax: z.string().optional(),
        IsOneTimeCustomer: z.string().optional(),
        IsDeliveryAddressOrderSpecific: z.string().optional(),
        FixedExchangeRate: z.number().optional(),
        ReportingCurrencyFixedExchangeRate: z.number().optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync sales order headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SalesOrder: SalesOrderSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        // skip can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. On a resumed execution we must
        // NOT call trackDeletesStart again — that would open a fresh window covering only the
        // remaining pages, and trackDeletesEnd would then treat every sales order from the
        // already-processed pages as missing and delete it. trackDeletesStart is only actually
        // called once we've seen a validated page that contains records, so an empty/anomalous
        // response never opens (and therefore never completes) a window that would wipe the
        // whole cache.
        let trackingStarted = skip > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,SalesOrderNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 10000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const salesOrders = page.map((item) => {
                const record = ProviderSalesOrderSchema.parse(item);
                return {
                    ...record,
                    id: `${record.dataAreaId}-${record.SalesOrderNumber}`
                };
            });

            if (!trackingStarted && salesOrders.length > 0) {
                await nango.trackDeletesStart('SalesOrder');
                trackingStarted = true;
            }

            if (salesOrders.length > 0) {
                await nango.batchSave(salesOrders, 'SalesOrder');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('SalesOrder');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
