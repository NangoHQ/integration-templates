import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawInvoiceSchema = z
    .object({
        dataAreaId: z.string(),
        InvoiceIdentifier: z.union([z.string(), z.number()]),
        FreeTextNumber: z.string().nullish(),
        InvoiceDate: z.string().nullish(),
        DueDate: z.string().nullish(),
        CustomerAccount: z.string().nullish(),
        CurrencyCode: z.string().nullish(),
        InvoiceAmount: z.number().nullish()
    })
    .passthrough();

const FreeTextInvoiceSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    invoiceIdentifier: z.string(),
    freeTextNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    customerAccount: z.string().optional(),
    currencyCode: z.string().optional(),
    invoiceAmount: z.number().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync free text (miscellaneous) customer invoice headers.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        FreeTextInvoice: FreeTextInvoiceSchema
    },

    exec: async (nango) => {
        // Blocker: FreeTextInvoiceHeaders does not expose a filterable modified-timestamp
        // field in this environment (confirmed by live audit per gotcha 3).
        // Persist the current $skip offset so an interrupted full refresh can
        // resume inside the same delete-tracking window.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/FreeTextInvoiceHeaders',
            params: {
                $orderby: 'dataAreaId asc,InvoiceIdentifier asc',
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

        for await (const page of nango.paginate(proxyConfig)) {
            if (!trackingStarted) {
                await nango.trackDeletesStart('FreeTextInvoice');
                trackingStarted = true;
            }

            const invoices = [];
            for (const raw of page) {
                const rawParsed = RawInvoiceSchema.safeParse(raw);
                if (!rawParsed.success) {
                    throw new Error(`Failed to parse FreeTextInvoiceHeaders record: ${rawParsed.error.message}`);
                }
                const record = rawParsed.data;
                const invoice = {
                    id: `${record.dataAreaId}-${String(record.InvoiceIdentifier)}`,
                    dataAreaId: record.dataAreaId,
                    invoiceIdentifier: String(record.InvoiceIdentifier),
                    ...(record.FreeTextNumber != null && { freeTextNumber: record.FreeTextNumber }),
                    ...(record.InvoiceDate != null && { invoiceDate: record.InvoiceDate }),
                    ...(record.DueDate != null && { dueDate: record.DueDate }),
                    ...(record.CustomerAccount != null && { customerAccount: record.CustomerAccount }),
                    ...(record.CurrencyCode != null && { currencyCode: record.CurrencyCode }),
                    ...(record.InvoiceAmount != null && { invoiceAmount: record.InvoiceAmount })
                };
                const modelParsed = FreeTextInvoiceSchema.safeParse(invoice);
                if (!modelParsed.success) {
                    throw new Error(`Failed to validate normalized FreeTextInvoice: ${modelParsed.error.message}`);
                }
                invoices.push(modelParsed.data);
            }

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'FreeTextInvoice');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('FreeTextInvoice');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
