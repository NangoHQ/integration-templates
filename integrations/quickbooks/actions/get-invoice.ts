import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the invoice. Example: "123"')
});

const ProviderMetaDataSchema = z
    .object({
        CreateTime: z.string().optional(),
        LastUpdatedTime: z.string().optional()
    })
    .passthrough();

const ProviderCustomFieldSchema = z
    .object({
        DefinitionId: z.string().optional(),
        Name: z.string().optional(),
        Type: z.string().optional(),
        StringValue: z.string().optional()
    })
    .passthrough();

const ProviderEmailAddressSchema = z
    .object({
        Address: z.string().optional()
    })
    .passthrough();

const ProviderPhysicalAddressSchema = z
    .object({
        Id: z.string().optional(),
        Line1: z.string().optional(),
        Line2: z.string().optional(),
        City: z.string().optional(),
        CountrySubDivisionCode: z.string().optional(),
        PostalCode: z.string().optional(),
        Lat: z.string().optional(),
        Long: z.string().optional()
    })
    .passthrough();

const ProviderCustomerSchema = z
    .object({
        value: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderAccountSchema = z
    .object({
        Id: z.string().optional(),
        Name: z.string().optional()
    })
    .passthrough();

const ProviderTaxCodeSchema = z
    .object({
        Id: z.string().optional(),
        Name: z.string().optional()
    })
    .passthrough();

const ProviderItemSchema = z
    .object({
        Id: z.string().optional(),
        Name: z.string().optional()
    })
    .passthrough();

const ProviderSalesItemLineDetailSchema = z
    .object({
        Item: ProviderItemSchema.optional(),
        TaxCodeRef: ProviderTaxCodeSchema.optional(),
        Qty: z.number().optional(),
        UnitPrice: z.number().optional()
    })
    .passthrough();

const ProviderSubTotalLineDetailSchema = z.object({}).passthrough();

const ProviderDiscountLineDetailSchema = z
    .object({
        DiscountAccountRef: ProviderAccountSchema.optional(),
        PercentBased: z.boolean().optional(),
        DiscountPercent: z.number().optional()
    })
    .passthrough();

const ProviderLineSchema = z
    .object({
        Id: z.string().optional(),
        LineNum: z.number().optional(),
        Description: z.string().optional(),
        Amount: z.number(),
        DetailType: z.string(),
        SalesItemLineDetail: ProviderSalesItemLineDetailSchema.optional(),
        SubTotalLineDetail: ProviderSubTotalLineDetailSchema.optional(),
        DiscountLineDetail: ProviderDiscountLineDetailSchema.optional()
    })
    .passthrough();

const ProviderTxnTaxDetailSchema = z
    .object({
        TotalTax: z.number().optional(),
        TxnTaxCodeRef: ProviderTaxCodeSchema.optional()
    })
    .passthrough();

const ProviderCurrencyRefSchema = z
    .object({
        value: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderInvoiceSchema = z
    .object({
        Id: z.string(),
        DocNumber: z.string().optional(),
        SyncToken: z.string().optional(),
        MetaData: ProviderMetaDataSchema.optional(),
        CustomField: z.array(ProviderCustomFieldSchema).optional(),
        TxnDate: z.string().optional(),
        CurrencyRef: ProviderCurrencyRefSchema.optional(),
        PrivateNote: z.string().optional(),
        LinkedTxn: z.array(z.object({}).passthrough()).optional(),
        Line: z.array(ProviderLineSchema).optional(),
        TxnTaxDetail: ProviderTxnTaxDetailSchema.optional(),
        CustomerRef: ProviderCustomerSchema,
        BillAddr: ProviderPhysicalAddressSchema.optional(),
        ShipAddr: ProviderPhysicalAddressSchema.optional(),
        BillEmail: ProviderEmailAddressSchema.optional(),
        TotalAmt: z.number().optional(),
        ApplyTaxAfterDiscount: z.boolean().optional(),
        PrintStatus: z.string().optional(),
        EmailStatus: z.string().optional(),
        Balance: z.number().optional(),
        Deposit: z.number().optional(),
        AllowIPNPayment: z.boolean().optional(),
        AllowOnlinePayment: z.boolean().optional(),
        AllowOnlineCreditCardPayment: z.boolean().optional(),
        AllowOnlineACHPayment: z.boolean().optional(),
        Status: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        Invoice: ProviderInvoiceSchema
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the invoice'),
    docNumber: z.string().optional().describe('The invoice document number'),
    syncToken: z.string().optional().describe('The sync token for optimistic locking'),
    createTime: z.string().optional().describe('The creation time of the invoice'),
    lastUpdatedTime: z.string().optional().describe('The last update time of the invoice'),
    txnDate: z.string().optional().describe('The transaction date'),
    privateNote: z.string().optional().describe('A private note on the invoice'),
    totalAmt: z.number().optional().describe('The total amount of the invoice'),
    balance: z.number().optional().describe('The remaining balance of the invoice'),
    deposit: z.number().optional().describe('The deposit amount applied to the invoice'),
    status: z.string().optional().describe('The status of the invoice (e.g., Pending, Paid)'),
    customerId: z.string().describe('The ID of the customer'),
    customerName: z.string().optional().describe('The display name of the customer'),
    billAddr: z.object({}).passthrough().optional().describe('The billing address'),
    shipAddr: z.object({}).passthrough().optional().describe('The shipping address'),
    billEmail: z.string().optional().describe('The billing email address'),
    lineItems: z.array(z.object({}).passthrough()).optional().describe('The line items on the invoice'),
    currencyCode: z.string().optional().describe('The currency code'),
    currencyName: z.string().optional().describe('The currency name')
});

const action = createAction({
    description: 'Retrieve an invoice by ID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(String(realmId))}/invoice/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                id: input.id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const invoice = parsed.Invoice;

        return {
            id: invoice.Id,
            ...(invoice.DocNumber !== undefined && { docNumber: invoice.DocNumber }),
            ...(invoice.SyncToken !== undefined && { syncToken: invoice.SyncToken }),
            ...(invoice.MetaData?.CreateTime !== undefined && { createTime: invoice.MetaData.CreateTime }),
            ...(invoice.MetaData?.LastUpdatedTime !== undefined && { lastUpdatedTime: invoice.MetaData.LastUpdatedTime }),
            ...(invoice.TxnDate !== undefined && { txnDate: invoice.TxnDate }),
            ...(invoice.PrivateNote !== undefined && { privateNote: invoice.PrivateNote }),
            ...(invoice.TotalAmt !== undefined && { totalAmt: invoice.TotalAmt }),
            ...(invoice.Balance !== undefined && { balance: invoice.Balance }),
            ...(invoice.Deposit !== undefined && { deposit: invoice.Deposit }),
            ...(invoice.Status !== undefined && { status: invoice.Status }),
            customerId: invoice.CustomerRef.value,
            ...(invoice.CustomerRef.name !== undefined && { customerName: invoice.CustomerRef.name }),
            ...(invoice.BillAddr !== undefined && { billAddr: invoice.BillAddr }),
            ...(invoice.ShipAddr !== undefined && { shipAddr: invoice.ShipAddr }),
            ...(invoice.BillEmail?.Address !== undefined && { billEmail: invoice.BillEmail.Address }),
            ...(invoice.Line !== undefined && { lineItems: invoice.Line }),
            ...(invoice.CurrencyRef?.value !== undefined && { currencyCode: invoice.CurrencyRef.value }),
            ...(invoice.CurrencyRef?.name !== undefined && { currencyName: invoice.CurrencyRef.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
