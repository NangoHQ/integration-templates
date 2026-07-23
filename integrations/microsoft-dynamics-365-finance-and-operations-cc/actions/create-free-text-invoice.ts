import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        CustomerAccount: z.string().describe('Customer account number. Example: "DAT-000004"'),
        InvoiceDate: z.string().describe('Invoice date in ISO 8601 format. Example: "2026-07-23"'),
        CurrencyCode: z.string().describe('Currency code. Example: "USD"'),
        dataAreaId: z.string().optional().describe('Company / data area ID. Defaults to the connection company if omitted. Example: "dat"')
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        InvoiceIdentifier: z.union([z.string(), z.number()]).optional(),
        FreeTextNumber: z.string().optional(),
        CustomerAccount: z.string().optional(),
        InvoiceDate: z.string().optional(),
        CurrencyCode: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        invoiceIdentifier: z.string().optional(),
        freeTextNumber: z.string().optional(),
        customerAccount: z.string().optional(),
        invoiceDate: z.string().optional(),
        currencyCode: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a free text invoice header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            CustomerAccount: input.CustomerAccount,
            InvoiceDate: input.InvoiceDate,
            CurrencyCode: input.CurrencyCode,
            ...(input.dataAreaId !== undefined && { dataAreaId: input.dataAreaId })
        };

        for (const key of Object.keys(input)) {
            if (!['CustomerAccount', 'InvoiceDate', 'CurrencyCode', 'dataAreaId'].includes(key)) {
                payload[key] = input[key];
            }
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.post({
            endpoint: '/data/FreeTextInvoiceHeaders',
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider: missing or non-object response data'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.InvoiceIdentifier !== undefined && { invoiceIdentifier: String(providerData.InvoiceIdentifier) }),
            ...(providerData.FreeTextNumber !== undefined && { freeTextNumber: providerData.FreeTextNumber }),
            ...(providerData.CustomerAccount !== undefined && { customerAccount: providerData.CustomerAccount }),
            ...(providerData.InvoiceDate !== undefined && { invoiceDate: providerData.InvoiceDate }),
            ...(providerData.CurrencyCode !== undefined && { currencyCode: providerData.CurrencyCode }),
            ...(providerData.dataAreaId !== undefined && { dataAreaId: providerData.dataAreaId }),
            ...Object.fromEntries(
                Object.entries(providerData).filter(
                    ([key]) => !['InvoiceIdentifier', 'FreeTextNumber', 'CustomerAccount', 'InvoiceDate', 'CurrencyCode', 'dataAreaId'].includes(key)
                )
            )
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
