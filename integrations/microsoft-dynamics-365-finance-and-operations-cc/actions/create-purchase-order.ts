import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/data area ID. Example: "dat"'),
    orderVendorAccountNumber: z.string().describe('Vendor account number for the ordering party. Example: "DAT-0000000002"'),
    invoiceVendorAccountNumber: z.string().describe('Vendor account number for invoicing. Example: "DAT-0000000002"'),
    currencyCode: z.string().describe('Currency code for the purchase order. Example: "USD"'),
    languageId: z.string().describe('Language ID for the purchase order. Example: "en-us"')
});

const ProviderPurchaseOrderHeaderSchema = z.object({
    dataAreaId: z.string(),
    PurchaseOrderNumber: z.string(),
    OrderVendorAccountNumber: z.string(),
    InvoiceVendorAccountNumber: z.string(),
    CurrencyCode: z.string(),
    LanguageId: z.string()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    purchaseOrderNumber: z.string(),
    orderVendorAccountNumber: z.string(),
    invoiceVendorAccountNumber: z.string(),
    currencyCode: z.string(),
    languageId: z.string()
});

const action = createAction({
    description: 'Create a purchase order header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            dataAreaId: input.dataAreaId,
            OrderVendorAccountNumber: input.orderVendorAccountNumber,
            InvoiceVendorAccountNumber: input.invoiceVendorAccountNumber,
            CurrencyCode: input.currencyCode,
            LanguageId: input.languageId
        };

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderHeadersV2',
            data: body,
            retries: 3
        });

        const providerHeader = ProviderPurchaseOrderHeaderSchema.parse(response.data);

        return {
            dataAreaId: providerHeader.dataAreaId,
            purchaseOrderNumber: providerHeader.PurchaseOrderNumber,
            orderVendorAccountNumber: providerHeader.OrderVendorAccountNumber,
            invoiceVendorAccountNumber: providerHeader.InvoiceVendorAccountNumber,
            currencyCode: providerHeader.CurrencyCode,
            languageId: providerHeader.LanguageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
