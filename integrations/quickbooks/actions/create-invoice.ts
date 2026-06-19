import { z } from 'zod';
import { createAction } from 'nango';

const CustomerRefSchema = z.object({
    value: z.string().describe('Customer ID. Example: "1"')
});

const ItemRefSchema = z.object({
    value: z.string().describe('Item ID. Example: "1"')
});

const LineSchema = z.object({
    detailType: z.literal('SalesItemLineDetail'),
    amount: z.number().describe('Line item amount. Example: 100.00'),
    salesItemLineDetail: z.object({
        itemRef: ItemRefSchema,
        qty: z.number().optional().describe('Quantity. Example: 1'),
        unitPrice: z.number().optional().describe('Unit price. Example: 100.00')
    })
});

const InputSchema = z.object({
    customerRef: CustomerRefSchema.describe('Reference to the customer'),
    txnDate: z.string().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    line: z.array(LineSchema).describe('Invoice line items')
});

const ProviderMetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderCustomerRefSchema = z.object({
    value: z.string()
});

const ProviderItemRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const ProviderSalesItemLineDetailSchema = z.object({
    ItemRef: ProviderItemRefSchema,
    Qty: z.number().optional(),
    UnitPrice: z.number().optional()
});

const ProviderSubTotalLineDetailSchema = z.object({});

const ProviderLineSchema = z.union([
    z.object({
        Id: z.string().optional(),
        DetailType: z.literal('SalesItemLineDetail'),
        Amount: z.number(),
        SalesItemLineDetail: ProviderSalesItemLineDetailSchema
    }),
    z.object({
        Id: z.string().optional(),
        DetailType: z.literal('SubTotalLineDetail'),
        Amount: z.number(),
        SubTotalLineDetail: ProviderSubTotalLineDetailSchema.optional()
    })
]);

const ProviderInvoiceSchema = z.object({
    Id: z.string(),
    CustomerRef: ProviderCustomerRefSchema,
    TxnDate: z.string(),
    Line: z.array(ProviderLineSchema),
    TotalAmt: z.number(),
    Balance: z.number(),
    MetaData: ProviderMetaDataSchema,
    DocNumber: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Invoice ID'),
    customerId: z.string().describe('Customer ID'),
    txnDate: z.string().describe('Transaction date'),
    totalAmount: z.number().describe('Total invoice amount'),
    balance: z.number().describe('Remaining balance'),
    docNumber: z.string().optional().describe('Document number'),
    lineItems: z.array(
        z.object({
            id: z.string().optional(),
            amount: z.number(),
            itemId: z.string(),
            qty: z.number().optional(),
            unitPrice: z.number().optional()
        })
    )
});

const action = createAction({
    description: 'Create a customer invoice with line items',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/invoice
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/invoice`,
            data: {
                CustomerRef: input.customerRef,
                TxnDate: input.txnDate,
                Line: input.line.map((lineItem) => ({
                    DetailType: lineItem.detailType,
                    Amount: lineItem.amount,
                    SalesItemLineDetail: {
                        ItemRef: lineItem.salesItemLineDetail.itemRef,
                        Qty: lineItem.salesItemLineDetail.qty,
                        UnitPrice: lineItem.salesItemLineDetail.unitPrice
                    }
                }))
            },
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const responseData = z.object({ Invoice: ProviderInvoiceSchema }).parse(response.data);
        const providerInvoice = responseData.Invoice;

        return {
            id: providerInvoice.Id,
            customerId: providerInvoice.CustomerRef.value,
            txnDate: providerInvoice.TxnDate,
            totalAmount: providerInvoice.TotalAmt,
            balance: providerInvoice.Balance,
            docNumber: providerInvoice.DocNumber,
            lineItems: providerInvoice.Line.filter((lineItem) => lineItem.DetailType === 'SalesItemLineDetail').map((lineItem) => {
                if (lineItem.DetailType !== 'SalesItemLineDetail') {
                    throw new Error('Unexpected line item type');
                }
                return {
                    id: lineItem.Id,
                    amount: lineItem.Amount,
                    itemId: lineItem.SalesItemLineDetail.ItemRef.value,
                    qty: lineItem.SalesItemLineDetail.Qty,
                    unitPrice: lineItem.SalesItemLineDetail.UnitPrice
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
