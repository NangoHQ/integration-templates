import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code (data area ID). Example: "dat"'),
    salesOrderNumber: z.string().describe('Sales order number to update. Example: "DAT-000001"'),
    salesOrderName: z.string().optional().describe('Sales order name/description.'),
    requestedReceiptDate: z.string().optional().describe('Requested receipt date in ISO 8601 format. Example: "2026-07-30T00:00:00Z"'),
    requestedShippingDate: z.string().optional().describe('Requested shipping date in ISO 8601 format. Example: "2026-07-30T00:00:00Z"'),
    paymentTermsName: z.string().optional().describe('Payment terms name. Example: "RFI30"'),
    currencyCode: z.string().optional().describe('Currency code. Example: "USD"'),
    salesTaxGroupCode: z.string().optional().describe('Sales tax group code. Example: "RFITAX"')
});

const ProviderSalesOrderSchema = z
    .object({
        dataAreaId: z.string(),
        SalesOrderNumber: z.string(),
        SalesOrderName: z.string().nullable().optional(),
        RequestedReceiptDate: z.string().nullable().optional(),
        RequestedShippingDate: z.string().nullable().optional(),
        PaymentTermsName: z.string().nullable().optional(),
        CurrencyCode: z.string().nullable().optional(),
        SalesTaxGroupCode: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string(),
    salesOrderNumber: z.string(),
    salesOrderName: z.string().optional(),
    requestedReceiptDate: z.string().optional(),
    requestedShippingDate: z.string().optional(),
    paymentTermsName: z.string().optional(),
    currencyCode: z.string().optional(),
    salesTaxGroupCode: z.string().optional()
});

const action = createAction({
    description: 'Update a sales order header.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            dataAreaId: input.dataAreaId
        };

        if (input.salesOrderName !== undefined) {
            body['SalesOrderName'] = input.salesOrderName;
        }
        if (input.requestedReceiptDate !== undefined) {
            body['RequestedReceiptDate'] = input.requestedReceiptDate;
        }
        if (input.requestedShippingDate !== undefined) {
            body['RequestedShippingDate'] = input.requestedShippingDate;
        }
        if (input.paymentTermsName !== undefined) {
            body['PaymentTermsName'] = input.paymentTermsName;
        }
        if (input.currencyCode !== undefined) {
            body['CurrencyCode'] = input.currencyCode;
        }
        if (input.salesTaxGroupCode !== undefined) {
            body['SalesTaxGroupCode'] = input.salesTaxGroupCode;
        }

        const endpoint = `data/SalesOrderHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',SalesOrderNumber='${encodeURIComponent(input.salesOrderNumber.replace(/'/g, "''"))}')`;

        const response = await nango.patch({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint,
            data: body,
            retries: 1
        });

        let providerData: unknown = response.data;
        if (!providerData || typeof providerData !== 'object') {
            const getResponse = await nango.get({
                // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
                endpoint,
                retries: 3
            });
            providerData = getResponse.data;
        }

        const providerSalesOrder = ProviderSalesOrderSchema.parse(providerData);

        return {
            dataAreaId: providerSalesOrder.dataAreaId,
            salesOrderNumber: providerSalesOrder.SalesOrderNumber,
            ...(providerSalesOrder.SalesOrderName != null && { salesOrderName: providerSalesOrder.SalesOrderName }),
            ...(providerSalesOrder.RequestedReceiptDate != null && { requestedReceiptDate: providerSalesOrder.RequestedReceiptDate }),
            ...(providerSalesOrder.RequestedShippingDate != null && { requestedShippingDate: providerSalesOrder.RequestedShippingDate }),
            ...(providerSalesOrder.PaymentTermsName != null && { paymentTermsName: providerSalesOrder.PaymentTermsName }),
            ...(providerSalesOrder.CurrencyCode != null && { currencyCode: providerSalesOrder.CurrencyCode }),
            ...(providerSalesOrder.SalesTaxGroupCode != null && { salesTaxGroupCode: providerSalesOrder.SalesTaxGroupCode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
