import { z } from 'zod';
import { createAction } from 'nango';

// Reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder

const ReferenceSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const AddressSchema = z.object({
    Id: z.string().optional(),
    Line1: z.string().optional(),
    Line2: z.string().optional(),
    Line3: z.string().optional(),
    Line4: z.string().optional(),
    Line5: z.string().optional(),
    City: z.string().optional(),
    Country: z.string().optional(),
    CountrySubDivisionCode: z.string().optional(),
    PostalCode: z.string().optional(),
    Lat: z.string().optional(),
    Long: z.string().optional()
});

const MarkupInfoSchema = z.object({
    PercentBased: z.boolean().optional(),
    Value: z.number().optional(),
    Percent: z.number().optional(),
    PriceLevelRef: ReferenceSchema.optional()
});

const ItemBasedExpenseLineDetailSchema = z.object({
    ItemRef: ReferenceSchema,
    CustomerRef: ReferenceSchema.optional(),
    PriceLevelRef: ReferenceSchema.optional(),
    TaxCodeRef: ReferenceSchema.optional(),
    Qty: z.number().optional(),
    UnitPrice: z.number().optional(),
    MarkupInfo: MarkupInfoSchema.optional(),
    BillableStatus: z.string().optional()
});

const AccountBasedExpenseLineDetailSchema = z.object({
    AccountRef: ReferenceSchema,
    CustomerRef: ReferenceSchema.optional(),
    TaxCodeRef: ReferenceSchema.optional(),
    TaxAmount: z.number().optional(),
    BillableStatus: z.string().optional()
});

const LineSchema = z.object({
    Id: z.string().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.enum(['ItemBasedExpenseLineDetail', 'AccountBasedExpenseLineDetail']),
    ItemBasedExpenseLineDetail: ItemBasedExpenseLineDetailSchema.optional(),
    AccountBasedExpenseLineDetail: AccountBasedExpenseLineDetailSchema.optional()
});

const CustomFieldSchema = z.object({
    DefinitionId: z.string(),
    Name: z.string().optional(),
    Type: z.string().optional(),
    StringValue: z.string().optional()
});

const InputSchema = z.object({
    VendorRef: ReferenceSchema.describe('Reference to the vendor for this purchase order. Example: { value: "123", name: "Hicks Hardware" }'),
    Line: z.array(LineSchema).describe('Line items for the purchase order'),
    APAccountRef: ReferenceSchema.optional().describe('AP account reference'),
    ShipTo: ReferenceSchema.optional().describe('Ship to reference'),
    TemplateRef: ReferenceSchema.optional().describe('Template reference'),
    TxnDate: z.string().optional().describe('Transaction date. Format: YYYY-MM-DD'),
    CurrencyRef: ReferenceSchema.optional().describe('Currency reference'),
    Memo: z.string().optional().describe('Memo for the purchase order'),
    PrivateNote: z.string().optional().describe('Private note not visible to vendor'),
    ShipAddr: AddressSchema.optional().describe('Shipping address'),
    VendorAddr: AddressSchema.optional().describe('Vendor address'),
    POStatus: z.enum(['Open', 'Closed']).optional().describe('Purchase order status'),
    DueDate: z.string().optional().describe('Due date. Format: YYYY-MM-DD'),
    ExpectedDate: z.string().optional().describe('Expected delivery date. Format: YYYY-MM-DD'),
    CustomField: z.array(CustomFieldSchema).optional().describe('Custom fields'),
    ClassRef: ReferenceSchema.optional().describe('Class reference'),
    SalesTermRef: ReferenceSchema.optional().describe('Sales term reference'),
    LinkedTxn: z
        .array(z.object({ TxnId: z.string(), TxnType: z.string() }))
        .optional()
        .describe('Linked transactions'),
    PrintStatus: z.enum(['NeedToPrint', 'Printed']).optional().describe('Print status')
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderPurchaseOrderSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    DocNumber: z.string().optional(),
    domain: z.string().optional(),
    APAccountRef: ReferenceSchema.optional(),
    CurrencyRef: ReferenceSchema.optional(),
    TxnDate: z.string().optional(),
    TotalAmt: z.number().optional(),
    ShipAddr: AddressSchema.optional(),
    VendorAddr: AddressSchema.optional(),
    POStatus: z.string().optional(),
    sparse: z.boolean().optional(),
    VendorRef: ReferenceSchema,
    Line: z.array(LineSchema),
    CustomField: z.array(CustomFieldSchema).optional(),
    MetaData: MetaDataSchema.optional(),
    time: z.string().optional(),
    Memo: z.string().optional(),
    PrivateNote: z.string().optional(),
    DueDate: z.string().optional(),
    ExpectedDate: z.string().optional(),
    ClassRef: ReferenceSchema.optional(),
    SalesTermRef: ReferenceSchema.optional(),
    PrintStatus: z.string().optional()
});

const ProviderPurchaseOrderResponseSchema = z.object({
    PurchaseOrder: ProviderPurchaseOrderSchema
});

const OutputSchema = z.object({
    id: z.string(),
    syncToken: z.string(),
    docNumber: z.string().optional(),
    vendorRef: ReferenceSchema,
    line: z.array(LineSchema),
    totalAmt: z.number().optional(),
    txnDate: z.string().optional(),
    poStatus: z.string().optional(),
    dueDate: z.string().optional(),
    expectedDate: z.string().optional(),
    memo: z.string().optional(),
    privateNote: z.string().optional(),
    shipAddr: AddressSchema.optional(),
    vendorAddr: AddressSchema.optional(),
    metaData: MetaDataSchema.optional()
});

async function getRealmId(nango: Parameters<Parameters<typeof createAction>[0]['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

function toPurchaseOrder(po: z.infer<typeof ProviderPurchaseOrderSchema>): z.infer<typeof OutputSchema> {
    return {
        id: po.Id,
        syncToken: po.SyncToken,
        docNumber: po.DocNumber,
        vendorRef: po.VendorRef,
        line: po.Line,
        totalAmt: po.TotalAmt,
        txnDate: po.TxnDate,
        poStatus: po.POStatus,
        dueDate: po.DueDate,
        expectedDate: po.ExpectedDate,
        memo: po.Memo,
        privateNote: po.PrivateNote,
        shipAddr: po.ShipAddr,
        vendorAddr: po.VendorAddr,
        metaData: po.MetaData
    };
}

const action = createAction({
    description: 'Create a QuickBooks purchase order',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        const requestBody: Record<string, unknown> = {
            VendorRef: input.VendorRef,
            Line: input.Line
        };

        if (input.APAccountRef !== undefined) {
            requestBody['APAccountRef'] = input.APAccountRef;
        }
        if (input.ShipTo !== undefined) {
            requestBody['ShipTo'] = input.ShipTo;
        }
        if (input.TemplateRef !== undefined) {
            requestBody['TemplateRef'] = input.TemplateRef;
        }
        if (input.TxnDate !== undefined) {
            requestBody['TxnDate'] = input.TxnDate;
        }
        if (input.CurrencyRef !== undefined) {
            requestBody['CurrencyRef'] = input.CurrencyRef;
        }
        if (input.Memo !== undefined) {
            requestBody['Memo'] = input.Memo;
        }
        if (input.PrivateNote !== undefined) {
            requestBody['PrivateNote'] = input.PrivateNote;
        }
        if (input.ShipAddr !== undefined) {
            requestBody['ShipAddr'] = input.ShipAddr;
        }
        if (input.VendorAddr !== undefined) {
            requestBody['VendorAddr'] = input.VendorAddr;
        }
        if (input.POStatus !== undefined) {
            requestBody['POStatus'] = input.POStatus;
        }
        if (input.DueDate !== undefined) {
            requestBody['DueDate'] = input.DueDate;
        }
        if (input.ExpectedDate !== undefined) {
            requestBody['ExpectedDate'] = input.ExpectedDate;
        }
        if (input.CustomField !== undefined) {
            requestBody['CustomField'] = input.CustomField;
        }
        if (input.ClassRef !== undefined) {
            requestBody['ClassRef'] = input.ClassRef;
        }
        if (input.SalesTermRef !== undefined) {
            requestBody['SalesTermRef'] = input.SalesTermRef;
        }
        if (input.LinkedTxn !== undefined) {
            requestBody['LinkedTxn'] = input.LinkedTxn;
        }
        if (input.PrintStatus !== undefined) {
            requestBody['PrintStatus'] = input.PrintStatus;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/purchaseorder`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderPurchaseOrderResponseSchema.parse(response.data);
        return toPurchaseOrder(providerResponse.PurchaseOrder);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
