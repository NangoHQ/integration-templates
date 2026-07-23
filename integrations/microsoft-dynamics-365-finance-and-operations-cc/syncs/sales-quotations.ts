import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRecordSchema = z
    .object({
        SalesQuotationNumber: z.string(),
        SalesQuotationName: z.string().nullish(),
        InvoiceCustomerAccountNumber: z.string().nullish(),
        SalesQuotationStatus: z.string().nullish(),
        CurrencyCode: z.string().nullish(),
        dataAreaId: z.string()
    })
    .passthrough();

const SalesQuotationSchema = z.object({
    id: z.string(),
    salesQuotationNumber: z.string().optional(),
    quotationName: z.string().optional(),
    customerAccount: z.string().optional(),
    status: z.string().optional(),
    currencyCode: z.string().optional(),
    dataAreaId: z.string()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync sales quotation headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SalesQuotation: SalesQuotationSchema
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

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationHeadersV2',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,SalesQuotationNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error(`Expected paginated page to be an array, received ${typeof page}`);
            }

            const quotations = [];
            for (const raw of page) {
                const parsed = ProviderRecordSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SalesQuotationHeadersV2 record: ${parsed.error.message}`);
                }

                const record = parsed.data;
                quotations.push({
                    // Composite id: quotation numbers can repeat across legal entities, so dataAreaId
                    // must be part of the persisted id to avoid collisions/overwrites between companies.
                    id: `${record.dataAreaId}|${record.SalesQuotationNumber}`,
                    salesQuotationNumber: record.SalesQuotationNumber,
                    dataAreaId: record.dataAreaId,
                    ...(record.SalesQuotationName != null && {
                        quotationName: record.SalesQuotationName
                    }),
                    ...(record.InvoiceCustomerAccountNumber != null && {
                        customerAccount: record.InvoiceCustomerAccountNumber
                    }),
                    ...(record.SalesQuotationStatus != null && {
                        status: record.SalesQuotationStatus
                    }),
                    ...(record.CurrencyCode != null && {
                        currencyCode: record.CurrencyCode
                    })
                });
            }

            if (shouldStartTracking) {
                await nango.trackDeletesStart('SalesQuotation');
                shouldStartTracking = false;
            }

            if (quotations.length > 0) {
                await nango.batchSave(quotations, 'SalesQuotation');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SalesQuotation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
