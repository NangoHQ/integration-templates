import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderingCustomerAccountNumber: z.string().describe('Ordering customer account number. Example: "DAT-000004"'),
    invoiceCustomerAccountNumber: z.string().describe('Invoice customer account number. Example: "DAT-000004"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"'),
    languageId: z.string().describe('Language ID. Example: "en-us"'),
    dataAreaId: z.string().describe('Company / legal entity ID. Example: "dat"')
});

const ProviderSalesOrderSchema = z
    .object({
        SalesOrderNumber: z.string().optional(),
        OrderingCustomerAccountNumber: z.string(),
        InvoiceCustomerAccountNumber: z.string(),
        CurrencyCode: z.string(),
        LanguageId: z.string(),
        dataAreaId: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    salesOrderNumber: z.string().optional().describe('Created sales order number'),
    orderingCustomerAccountNumber: z.string(),
    invoiceCustomerAccountNumber: z.string(),
    currencyCode: z.string(),
    languageId: z.string(),
    dataAreaId: z.string()
});

const action = createAction({
    description: 'Create a sales order header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            data: {
                OrderingCustomerAccountNumber: input.orderingCustomerAccountNumber,
                InvoiceCustomerAccountNumber: input.invoiceCustomerAccountNumber,
                CurrencyCode: input.currencyCode,
                LanguageId: input.languageId,
                dataAreaId: input.dataAreaId
            },
            retries: 10
        });

        const providerOrder = ProviderSalesOrderSchema.parse(response.data);

        return {
            ...(providerOrder.SalesOrderNumber != null && { salesOrderNumber: providerOrder.SalesOrderNumber }),
            orderingCustomerAccountNumber: providerOrder.OrderingCustomerAccountNumber,
            invoiceCustomerAccountNumber: providerOrder.InvoiceCustomerAccountNumber,
            currencyCode: providerOrder.CurrencyCode,
            languageId: providerOrder.LanguageId,
            dataAreaId: providerOrder.dataAreaId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
