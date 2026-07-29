import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / legal entity code. Example: "dat"'),
    orderVendorAccountNumber: z.string().describe('Vendor account number for the order. Example: "DAT-0000000002"'),
    invoiceVendorAccountNumber: z.string().describe('Vendor account number for invoicing. Example: "DAT-0000000002"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"'),
    languageId: z.string().describe('Language ID. Example: "en-us"')
});

const ProviderPurchaseOrderSchema = z
    .object({
        PurchaseOrderNumber: z.string().optional(),
        OrderVendorAccountNumber: z.string().optional(),
        InvoiceVendorAccountNumber: z.string().optional(),
        CurrencyCode: z.string().optional(),
        LanguageId: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    purchaseOrderNumber: z.string().optional(),
    orderVendorAccountNumber: z.string().optional(),
    invoiceVendorAccountNumber: z.string().optional(),
    currencyCode: z.string().optional(),
    languageId: z.string().optional(),
    dataAreaId: z.string().optional()
});

const action = createAction({
    description: 'Create a purchase order header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Financials'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderHeadersV2',
            data: {
                dataAreaId: input.dataAreaId,
                OrderVendorAccountNumber: input.orderVendorAccountNumber,
                InvoiceVendorAccountNumber: input.invoiceVendorAccountNumber,
                CurrencyCode: input.currencyCode,
                LanguageId: input.languageId
            },
            retries: 3
        });

        const providerOrder = ProviderPurchaseOrderSchema.parse(response.data);

        return {
            ...(providerOrder.PurchaseOrderNumber !== undefined && { purchaseOrderNumber: providerOrder.PurchaseOrderNumber }),
            ...(providerOrder.OrderVendorAccountNumber !== undefined && { orderVendorAccountNumber: providerOrder.OrderVendorAccountNumber }),
            ...(providerOrder.InvoiceVendorAccountNumber !== undefined && { invoiceVendorAccountNumber: providerOrder.InvoiceVendorAccountNumber }),
            ...(providerOrder.CurrencyCode !== undefined && { currencyCode: providerOrder.CurrencyCode }),
            ...(providerOrder.LanguageId !== undefined && { languageId: providerOrder.LanguageId }),
            ...(providerOrder.dataAreaId !== undefined && { dataAreaId: providerOrder.dataAreaId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
