import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The unique identifier of the invoice to update. Example: "123"'),
    SyncToken: z.string().describe('The current sync token of the invoice for optimistic locking. Example: "1"'),
    sparse: z.boolean().optional().describe('Whether to perform a sparse update (only update provided fields). Defaults to true.'),
    CustomerRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .describe('Customer reference for the invoice'),
    Line: z
        .array(
            z.object({
                Id: z.string().optional(),
                LineNum: z.string().optional(),
                Description: z.string().optional(),
                Amount: z.number().optional(),
                DetailType: z.string().optional(),
                SalesItemLineDetail: z
                    .object({
                        ItemRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
                        UnitPrice: z.number().optional(),
                        Qty: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional()
        .describe('Line items for the invoice'),
    TxnDate: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
    DueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
    BillEmail: z.object({ Address: z.string().optional() }).optional().describe('Email address for billing'),
    ShipFromAddr: z.object({}).passthrough().optional().describe('Shipping from address'),
    ShipToAddr: z.object({}).passthrough().optional().describe('Shipping to address'),
    BillAddr: z.object({}).passthrough().optional().describe('Billing address'),
    ShipDate: z.string().optional().describe('Ship date (YYYY-MM-DD)'),
    TrackingNum: z.string().optional().describe('Tracking number'),
    PrivateNote: z.string().optional().describe('Private note for internal use'),
    CustomerMemo: z.object({ value: z.string().optional() }).optional().describe('Customer-facing memo'),
    SalesTermRef: z.object({ value: z.string().optional() }).optional().describe('Sales terms reference'),
    SalesRepRef: z.object({ value: z.string().optional() }).optional().describe('Sales representative reference'),
    TxnTaxDetail: z.object({}).passthrough().optional().describe('Tax details'),
    Deposit: z.number().optional().describe('Deposit amount'),
    DepositToAccountRef: z.object({ value: z.string().optional() }).optional().describe('Deposit account reference'),
    AllowIPNPayment: z.boolean().optional().describe('Allow IPN payment'),
    AllowOnlinePayment: z.boolean().optional().describe('Allow online payment'),
    AllowOnlineCreditCardPayment: z.boolean().optional().describe('Allow online credit card payment'),
    AllowOnlineACHPayment: z.boolean().optional().describe('Allow online ACH payment'),
    PrintStatus: z.string().optional().describe('Print status'),
    EmailStatus: z.string().optional().describe('Email status'),
    DeliveryInfo: z.object({}).passthrough().optional().describe('Delivery information')
});

const ProviderInvoiceSchema = z.object({
    Invoice: z.object({
        Id: z.string(),
        SyncToken: z.string(),
        MetaData: z
            .object({
                CreateTime: z.string(),
                LastUpdatedTime: z.string()
            })
            .optional(),
        CustomField: z.array(z.unknown()).optional(),
        DocNumber: z.string().optional(),
        TxnDate: z.string().optional(),
        CurrencyRef: z.object({ value: z.string().optional(), name: z.string().optional() }).optional(),
        LinkedTxn: z.array(z.unknown()).optional(),
        Line: z.array(z.unknown()).optional(),
        TxnTaxDetail: z.unknown().optional(),
        CustomerRef: z.object({ value: z.string().optional(), name: z.string().optional() }).optional(),
        CustomerMemo: z.object({ value: z.string().optional() }).optional(),
        BillAddr: z.unknown().optional(),
        ShipAddr: z.unknown().optional(),
        BillEmail: z.object({ Address: z.string().optional() }).optional(),
        BillEmailCc: z.object({ Address: z.string().optional() }).optional(),
        BillEmailBcc: z.object({ Address: z.string().optional() }).optional(),
        ShipFromAddr: z.unknown().optional(),
        ShipToAddr: z.unknown().optional(),
        SalesTermRef: z.object({ value: z.string().optional() }).optional(),
        DueDate: z.string().optional(),
        ShipDate: z.string().optional(),
        TrackingNum: z.string().optional(),
        TotalAmt: z.number().optional(),
        HomeTotalAmt: z.number().optional(),
        ApplyTaxAfterDiscount: z.boolean().optional(),
        Balance: z.number().optional(),
        Deposit: z.number().optional(),
        DepositToAccountRef: z.object({ value: z.string().optional() }).optional(),
        PrivateNote: z.string().optional(),
        SalesRepRef: z.object({ value: z.string().optional() }).optional(),
        ItemSalesTaxRef: z.object({ value: z.string().optional() }).optional(),
        Status: z.string().optional(),
        AllowIPNPayment: z.boolean().optional(),
        AllowOnlinePayment: z.boolean().optional(),
        AllowOnlineCreditCardPayment: z.boolean().optional(),
        AllowOnlineACHPayment: z.boolean().optional(),
        PrintStatus: z.string().optional(),
        EmailStatus: z.string().optional(),
        DeliveryInfo: z.unknown().optional(),
        domain: z.string().optional(),
        sparse: z.boolean().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    docNumber: z.string().optional(),
    txnDate: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    totalAmount: z.number().optional(),
    balance: z.number().optional(),
    customerRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    lineItems: z.array(z.unknown()).optional(),
    billEmail: z.string().optional(),
    shipDate: z.string().optional(),
    trackingNum: z.string().optional(),
    privateNote: z.string().optional(),
    customerMemo: z.string().optional(),
    printStatus: z.string().optional(),
    emailStatus: z.string().optional()
});

async function getCompany(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

const action = createAction({
    description: 'Update an invoice using its current SyncToken',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // Build the invoice payload for update
        const invoicePayload: Record<string, unknown> = {
            Id: input.Id,
            SyncToken: input.SyncToken,
            sparse: input.sparse ?? true
        };

        // Add optional fields if provided
        if (input.CustomerRef !== undefined) {
            invoicePayload['CustomerRef'] = input.CustomerRef;
        }
        if (input.Line !== undefined) {
            invoicePayload['Line'] = input.Line;
        }
        if (input.TxnDate !== undefined) {
            invoicePayload['TxnDate'] = input.TxnDate;
        }
        if (input.DueDate !== undefined) {
            invoicePayload['DueDate'] = input.DueDate;
        }
        if (input.BillEmail !== undefined) {
            invoicePayload['BillEmail'] = input.BillEmail;
        }
        if (input.ShipFromAddr !== undefined) {
            invoicePayload['ShipFromAddr'] = input.ShipFromAddr;
        }
        if (input.ShipToAddr !== undefined) {
            invoicePayload['ShipToAddr'] = input.ShipToAddr;
        }
        if (input.BillAddr !== undefined) {
            invoicePayload['BillAddr'] = input.BillAddr;
        }
        if (input.ShipDate !== undefined) {
            invoicePayload['ShipDate'] = input.ShipDate;
        }
        if (input.TrackingNum !== undefined) {
            invoicePayload['TrackingNum'] = input.TrackingNum;
        }
        if (input.PrivateNote !== undefined) {
            invoicePayload['PrivateNote'] = input.PrivateNote;
        }
        if (input.CustomerMemo !== undefined) {
            invoicePayload['CustomerMemo'] = input.CustomerMemo;
        }
        if (input.SalesTermRef !== undefined) {
            invoicePayload['SalesTermRef'] = input.SalesTermRef;
        }
        if (input.SalesRepRef !== undefined) {
            invoicePayload['SalesRepRef'] = input.SalesRepRef;
        }
        if (input.TxnTaxDetail !== undefined) {
            invoicePayload['TxnTaxDetail'] = input.TxnTaxDetail;
        }
        if (input.Deposit !== undefined) {
            invoicePayload['Deposit'] = input.Deposit;
        }
        if (input.DepositToAccountRef !== undefined) {
            invoicePayload['DepositToAccountRef'] = input.DepositToAccountRef;
        }
        if (input.AllowIPNPayment !== undefined) {
            invoicePayload['AllowIPNPayment'] = input.AllowIPNPayment;
        }
        if (input.AllowOnlinePayment !== undefined) {
            invoicePayload['AllowOnlinePayment'] = input.AllowOnlinePayment;
        }
        if (input.AllowOnlineCreditCardPayment !== undefined) {
            invoicePayload['AllowOnlineCreditCardPayment'] = input.AllowOnlineCreditCardPayment;
        }
        if (input.AllowOnlineACHPayment !== undefined) {
            invoicePayload['AllowOnlineACHPayment'] = input.AllowOnlineACHPayment;
        }
        if (input.PrintStatus !== undefined) {
            invoicePayload['PrintStatus'] = input.PrintStatus;
        }
        if (input.EmailStatus !== undefined) {
            invoicePayload['EmailStatus'] = input.EmailStatus;
        }
        if (input.DeliveryInfo !== undefined) {
            invoicePayload['DeliveryInfo'] = input.DeliveryInfo;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#update-an-invoice
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/invoice`,
            data: invoicePayload,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const result = ProviderInvoiceSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse QuickBooks invoice update response',
                details: result.error.format()
            });
        }

        const invoice = result.data.Invoice;

        return {
            id: invoice.Id,
            syncToken: invoice.SyncToken,
            createdAt: invoice.MetaData?.CreateTime,
            updatedAt: invoice.MetaData?.LastUpdatedTime,
            docNumber: invoice.DocNumber,
            txnDate: invoice.TxnDate,
            dueDate: invoice.DueDate,
            status: invoice.Status,
            totalAmount: invoice.TotalAmt,
            balance: invoice.Balance,
            customerRef: invoice.CustomerRef,
            lineItems: invoice.Line,
            billEmail: invoice.BillEmail?.Address,
            shipDate: invoice.ShipDate,
            trackingNum: invoice.TrackingNum,
            privateNote: invoice.PrivateNote,
            customerMemo: invoice.CustomerMemo?.value,
            printStatus: invoice.PrintStatus,
            emailStatus: invoice.EmailStatus
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
