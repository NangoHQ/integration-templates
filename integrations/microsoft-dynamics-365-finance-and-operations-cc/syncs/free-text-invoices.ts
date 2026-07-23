import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderInvoiceSchema = z.object({
    dataAreaId: z.string(),
    InvoiceIdentifier: z.union([z.string(), z.number()]),
    InvoiceName: z.string().nullish(),
    FreeTextNumber: z.string().nullish(),
    CustomerAccount: z.string().nullish(),
    InvoiceAccount: z.string().nullish(),
    InvoiceDate: z.string().nullish(),
    DueDate: z.string().nullish(),
    CurrencyCode: z.string().nullish(),
    ExchangeRate: z.number().nullish(),
    TermsOfPayment: z.string().nullish(),
    MethodOfPayment: z.string().nullish(),
    IsPosted: z.string().nullish(),
    CustomerGroup: z.string().nullish(),
    PostingProfile: z.string().nullish(),
    CashDiscountPercentage: z.number().nullish(),
    IsCorrection: z.string().nullish(),
    LanguageId: z.string().nullish()
});

const FreeTextInvoiceSchema = z.object({
    id: z.string(),
    dataAreaId: z.string(),
    invoiceIdentifier: z.string(),
    invoiceName: z.string().optional(),
    freeTextNumber: z.string().optional(),
    customerAccount: z.string().optional(),
    invoiceAccount: z.string().optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    currencyCode: z.string().optional(),
    exchangeRate: z.number().optional(),
    termsOfPayment: z.string().optional(),
    methodOfPayment: z.string().optional(),
    isPosted: z.string().optional(),
    customerGroup: z.string().optional(),
    postingProfile: z.string().optional(),
    cashDiscountPercentage: z.number().optional(),
    isCorrection: z.string().optional(),
    languageId: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync free text (miscellaneous) customer invoice headers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        FreeTextInvoice: FreeTextInvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        if (skip === 0) {
            await nango.trackDeletesStart('FreeTextInvoice');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/FreeTextInvoiceHeaders',
            params: {
                'cross-company': 'true',
                $orderby: 'dataAreaId asc,InvoiceIdentifier asc'
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
            const invoices = page.map((record: unknown) => {
                const parsed = ProviderInvoiceSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }
                const r = parsed.data;
                const invoiceIdentifier = String(r.InvoiceIdentifier);
                return {
                    id: `${r.dataAreaId}-${invoiceIdentifier}`,
                    dataAreaId: r.dataAreaId,
                    invoiceIdentifier,
                    ...(r.InvoiceName != null && { invoiceName: r.InvoiceName }),
                    ...(r.FreeTextNumber != null && { freeTextNumber: r.FreeTextNumber }),
                    ...(r.CustomerAccount != null && { customerAccount: r.CustomerAccount }),
                    ...(r.InvoiceAccount != null && { invoiceAccount: r.InvoiceAccount }),
                    ...(r.InvoiceDate != null && { invoiceDate: r.InvoiceDate }),
                    ...(r.DueDate != null && { dueDate: r.DueDate }),
                    ...(r.CurrencyCode != null && { currencyCode: r.CurrencyCode }),
                    ...(r.ExchangeRate != null && { exchangeRate: r.ExchangeRate }),
                    ...(r.TermsOfPayment != null && { termsOfPayment: r.TermsOfPayment }),
                    ...(r.MethodOfPayment != null && { methodOfPayment: r.MethodOfPayment }),
                    ...(r.IsPosted != null && { isPosted: r.IsPosted }),
                    ...(r.CustomerGroup != null && { customerGroup: r.CustomerGroup }),
                    ...(r.PostingProfile != null && { postingProfile: r.PostingProfile }),
                    ...(r.CashDiscountPercentage != null && { cashDiscountPercentage: r.CashDiscountPercentage }),
                    ...(r.IsCorrection != null && { isCorrection: r.IsCorrection }),
                    ...(r.LanguageId != null && { languageId: r.LanguageId })
                };
            });

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'FreeTextInvoice');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FreeTextInvoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
