import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / legal entity. Example: "dat"'),
    OrderingCustomerAccountNumber: z.string().describe('Customer account number that places the order. Example: "DAT-000004"'),
    InvoiceCustomerAccountNumber: z.string().describe('Customer account number to invoice. Example: "DAT-000004"'),
    CurrencyCode: z.string().describe('Currency code. Example: "USD"'),
    LanguageId: z.string().describe('Language ID. Example: "en-us"'),
    RequestedReceiptDate: z.string().optional().describe('Requested receipt date (ISO 8601). Example: "2026-07-23"'),
    RequestedShipDate: z.string().optional().describe('Requested ship date (ISO 8601). Example: "2026-07-23"'),
    CustomerReference: z.string().optional().describe('Customer reference. Example: "PO-12345"'),
    SalesOrderName: z.string().optional().describe('Sales order name / description. Example: "Test order"')
});

const ProviderSalesOrderSchema = z.object({
    dataAreaId: z.string(),
    SalesOrderNumber: z.string(),
    OrderingCustomerAccountNumber: z.string(),
    InvoiceCustomerAccountNumber: z.string(),
    CurrencyCode: z.string(),
    LanguageId: z.string(),
    RequestedReceiptDate: z.string().nullable().optional(),
    RequestedShipDate: z.string().nullable().optional(),
    CustomerReference: z.string().nullable().optional(),
    SalesOrderName: z.string().nullable().optional(),
    SalesOrderStatus: z.string().nullable().optional(),
    CreatedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    dataAreaId: z.string(),
    salesOrderNumber: z.string(),
    orderingCustomerAccountNumber: z.string(),
    invoiceCustomerAccountNumber: z.string(),
    currencyCode: z.string(),
    languageId: z.string(),
    requestedReceiptDate: z.string().optional(),
    requestedShipDate: z.string().optional(),
    customerReference: z.string().optional(),
    salesOrderName: z.string().optional(),
    salesOrderStatus: z.string().optional(),
    createdDateTime: z.string().optional()
});

const action = createAction({
    description: 'Create a sales order header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Financials', 'User'], // typical D365 FO scopes; may vary by tenant setup

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            dataAreaId: input.dataAreaId,
            OrderingCustomerAccountNumber: input.OrderingCustomerAccountNumber,
            InvoiceCustomerAccountNumber: input.InvoiceCustomerAccountNumber,
            CurrencyCode: input.CurrencyCode,
            LanguageId: input.LanguageId
        };

        if (input.RequestedReceiptDate !== undefined) {
            body['RequestedReceiptDate'] = input.RequestedReceiptDate;
        }
        if (input.RequestedShipDate !== undefined) {
            body['RequestedShipDate'] = input.RequestedShipDate;
        }
        if (input.CustomerReference !== undefined) {
            body['CustomerReference'] = input.CustomerReference;
        }
        if (input.SalesOrderName !== undefined) {
            body['SalesOrderName'] = input.SalesOrderName;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            data: body,
            retries: 10
        });

        const providerSalesOrder = ProviderSalesOrderSchema.parse(response.data);

        return {
            dataAreaId: providerSalesOrder.dataAreaId,
            salesOrderNumber: providerSalesOrder.SalesOrderNumber,
            orderingCustomerAccountNumber: providerSalesOrder.OrderingCustomerAccountNumber,
            invoiceCustomerAccountNumber: providerSalesOrder.InvoiceCustomerAccountNumber,
            currencyCode: providerSalesOrder.CurrencyCode,
            languageId: providerSalesOrder.LanguageId,
            ...(providerSalesOrder.RequestedReceiptDate != null && { requestedReceiptDate: providerSalesOrder.RequestedReceiptDate }),
            ...(providerSalesOrder.RequestedShipDate != null && { requestedShipDate: providerSalesOrder.RequestedShipDate }),
            ...(providerSalesOrder.CustomerReference != null && { customerReference: providerSalesOrder.CustomerReference }),
            ...(providerSalesOrder.SalesOrderName != null && { salesOrderName: providerSalesOrder.SalesOrderName }),
            ...(providerSalesOrder.SalesOrderStatus != null && { salesOrderStatus: providerSalesOrder.SalesOrderStatus }),
            ...(providerSalesOrder.CreatedDateTime != null && { createdDateTime: providerSalesOrder.CreatedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
