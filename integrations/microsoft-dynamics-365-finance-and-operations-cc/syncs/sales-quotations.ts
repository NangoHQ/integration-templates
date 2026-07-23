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

        // skip can only be > 0 if an earlier execution already advanced past at least one
        // non-empty page (see the trackingStarted-gating below), which means that earlier
        // execution must have already called trackDeletesStart. On a resumed execution we must
        // NOT call trackDeletesStart again — that would open a fresh window covering only the
        // remaining pages, and trackDeletesEnd would then treat every quotation from the
        // already-processed pages as missing and delete it. trackDeletesStart is only actually
        // called once we've seen a validated page that contains records, so an empty/anomalous
        // response never opens (and therefore never completes) a window that would wipe the
        // whole cache.
        let trackingStarted = skip > 0;

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

            if (!trackingStarted && quotations.length > 0) {
                await nango.trackDeletesStart('SalesQuotation');
                trackingStarted = true;
            }

            if (quotations.length > 0) {
                await nango.batchSave(quotations, 'SalesQuotation');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('SalesQuotation');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
