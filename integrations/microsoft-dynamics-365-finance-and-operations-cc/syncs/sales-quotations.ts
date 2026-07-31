import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderItemSchema = z
    .object({
        dataAreaId: z.string(),
        SalesQuotationNumber: z.string()
    })
    .passthrough();

const SalesQuotationSchema = z
    .object({
        id: z.string(),
        dataAreaId: z.string(),
        SalesQuotationNumber: z.string(),
        SalesQuotationName: z.string().optional(),
        SalesQuotationStatus: z.string().optional(),
        RequestingCustomerAccountNumber: z.string().optional(),
        InvoiceCustomerAccountNumber: z.string().optional(),
        CurrencyCode: z.string().optional(),
        SalesQuotationExpiryDate: z.string().optional(),
        SalesQuotationFollowUpDate: z.string().optional(),
        ReceiptDateRequested: z.string().optional(),
        RequestedShippingDate: z.string().optional(),
        QuotationTotalAmount: z.number().optional(),
        LanguageId: z.string().optional(),
        Email: z.string().optional(),
        URL: z.string().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync sales quotation headers',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SalesQuotation: SalesQuotationSchema
    },

    exec: async (nango) => {
        // Blocker: SalesQuotationHeadersV2 does not expose a filterable
        // last-modified timestamp in this environment. Full refresh with
        // $top/$skip is required. Persist the current $skip offset so an
        // interrupted crawl can resume inside the same delete window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationHeadersV2',
            params: {
                $orderby: 'dataAreaId asc,SalesQuotationNumber asc',
                'cross-company': 'true'
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

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.record(z.string(), z.unknown())).parse(pageResults);

            if (!trackingStarted) {
                await nango.trackDeletesStart('SalesQuotation');
                trackingStarted = true;
            }

            const quotations = rawItems.map((raw) => {
                const record = ProviderItemSchema.parse(raw);

                return {
                    ...record,
                    id: `${record.dataAreaId}-${record.SalesQuotationNumber}`
                };
            });

            if (quotations.length > 0) {
                await nango.batchSave(quotations, 'SalesQuotation');
            }

            offset += pageResults.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('SalesQuotation');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
