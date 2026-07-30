import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderingCustomerAccountNumber: z.string().describe('Ordering customer account number. Example: "DAT-000004"'),
    invoiceCustomerAccountNumber: z.string().describe('Invoice customer account number. Example: "DAT-000004"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"'),
    languageId: z.string().describe('Language ID. Example: "en-us"'),
    dataAreaId: z.string().describe('Company / legal entity ID. Example: "dat"'),
    requestedReceiptDate: z.string().optional().describe('Requested receipt date (ISO 8601). Example: "2026-07-23"'),
    requestedShippingDate: z.string().optional().describe('Requested shipping date (ISO 8601). Example: "2026-07-23"'),
    customerReference: z.string().optional().describe('Customer requisition/reference number. Example: "PO-12345"'),
    salesOrderName: z.string().optional().describe('Sales order name / description. Example: "Test order"')
});

const ProviderSalesOrderSchema = z
    .object({
        SalesOrderNumber: z.string().optional(),
        OrderingCustomerAccountNumber: z.string(),
        InvoiceCustomerAccountNumber: z.string(),
        CurrencyCode: z.string(),
        LanguageId: z.string(),
        dataAreaId: z.string(),
        RequestedReceiptDate: z.string().nullable().optional(),
        RequestedShippingDate: z.string().nullable().optional(),
        CustomerRequisitionNumber: z.string().nullable().optional(),
        SalesOrderName: z.string().nullable().optional(),
        SalesOrderStatus: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    salesOrderNumber: z.string().optional().describe('Created sales order number'),
    orderingCustomerAccountNumber: z.string(),
    invoiceCustomerAccountNumber: z.string(),
    currencyCode: z.string(),
    languageId: z.string(),
    dataAreaId: z.string(),
    requestedReceiptDate: z.string().optional(),
    requestedShippingDate: z.string().optional(),
    customerReference: z.string().optional(),
    salesOrderName: z.string().optional(),
    salesOrderStatus: z.string().optional()
});

const action = createAction({
    description: 'Create a sales order header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            OrderingCustomerAccountNumber: input.orderingCustomerAccountNumber,
            InvoiceCustomerAccountNumber: input.invoiceCustomerAccountNumber,
            CurrencyCode: input.currencyCode,
            LanguageId: input.languageId,
            dataAreaId: input.dataAreaId
        };

        // Field names validated against the live SalesOrderHeaderV2 entity: RequestedShipDate and
        // CustomerReference are not real properties on this entity (RequestedShippingDate and
        // CustomerRequisitionNumber are), so those are the names used both here and on parse below.
        if (input.requestedReceiptDate !== undefined) {
            body['RequestedReceiptDate'] = input.requestedReceiptDate;
        }
        if (input.requestedShippingDate !== undefined) {
            body['RequestedShippingDate'] = input.requestedShippingDate;
        }
        if (input.customerReference !== undefined) {
            body['CustomerRequisitionNumber'] = input.customerReference;
        }
        if (input.salesOrderName !== undefined) {
            body['SalesOrderName'] = input.salesOrderName;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderHeadersV2',
            data: body,
            retries: 10
        });

        const providerOrder = ProviderSalesOrderSchema.parse(response.data);

        return {
            ...(providerOrder.SalesOrderNumber != null && { salesOrderNumber: providerOrder.SalesOrderNumber }),
            orderingCustomerAccountNumber: providerOrder.OrderingCustomerAccountNumber,
            invoiceCustomerAccountNumber: providerOrder.InvoiceCustomerAccountNumber,
            currencyCode: providerOrder.CurrencyCode,
            languageId: providerOrder.LanguageId,
            dataAreaId: providerOrder.dataAreaId,
            ...(providerOrder.RequestedReceiptDate != null && { requestedReceiptDate: providerOrder.RequestedReceiptDate }),
            ...(providerOrder.RequestedShippingDate != null && { requestedShippingDate: providerOrder.RequestedShippingDate }),
            ...(providerOrder.CustomerRequisitionNumber != null && { customerReference: providerOrder.CustomerRequisitionNumber }),
            ...(providerOrder.SalesOrderName != null && { salesOrderName: providerOrder.SalesOrderName }),
            ...(providerOrder.SalesOrderStatus != null && { salesOrderStatus: providerOrder.SalesOrderStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
