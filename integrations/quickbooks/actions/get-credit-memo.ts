import { z } from 'zod';
import { createAction } from 'nango';

// QuickBooks CreditMemo API Reference
// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo

const InputSchema = z.object({
    creditMemoId: z.string().describe('The unique identifier of the credit memo. Example: "123"')
});

// Raw provider response schema (QuickBooks API fields)
const ProviderCreditMemoSchema = z.object({
    Id: z.string(),
    DocNumber: z.string().optional(),
    TxnDate: z.string().optional(),
    PrivateNote: z.string().optional(),
    TotalAmt: z.number().optional(),
    Balance: z.number().optional(),
    Line: z.array(z.unknown()).optional(),
    CustomerRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    BillEmail: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    BillAddr: z.unknown().optional(),
    ShipAddr: z.unknown().optional(),
    ClassRef: z.unknown().optional(),
    DepositToAccountRef: z.unknown().optional(),
    PaymentMethodRef: z.unknown().optional(),
    PaymentType: z.string().optional(),
    CheckPayment: z.unknown().optional(),
    CreditCardPayment: z.unknown().optional(),
    PrintStatus: z.string().optional(),
    EmailStatus: z.string().optional(),
    DeliveryInfo: z.unknown().optional(),
    ShipDate: z.string().optional(),
    TrackingNum: z.string().optional(),
    GlobalTaxCalculation: z.string().optional(),
    TotalTax: z.number().optional(),
    TransactionLocationType: z.string().optional(),
    ApplyTaxAfterDiscount: z.boolean().optional(),
    TaxExemptionRef: z.unknown().optional(),
    Memo: z.string().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional(),
    Status: z.string().optional(),
    TaxDetails: z.unknown().optional(),
    RecurringInfo: z.unknown().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the credit memo'),
    docNumber: z.string().optional().describe('The document number'),
    txnDate: z.string().optional().describe('The transaction date'),
    privateNote: z.string().optional().describe('Private note'),
    totalAmount: z.number().optional().describe('The total amount of the credit memo'),
    balance: z.number().optional().describe('The remaining balance'),
    status: z.string().optional().describe('The status of the credit memo (e.g., Pending, Paid, Voided)'),
    customerId: z.string().optional().describe('Customer reference ID'),
    customerName: z.string().optional().describe('Customer reference name'),
    memo: z.string().optional().describe('Public memo'),
    createdTime: z.string().optional().describe('When the credit memo was created'),
    lastUpdatedTime: z.string().optional().describe('When the credit memo was last updated')
});

const action = createAction({
    description: 'Retrieve a QuickBooks credit memo by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-credit-memo',
        group: 'Credit Memos'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config?.['realmId'];
        if (typeof realmId !== 'string' || !realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/creditmemo/${encodeURIComponent(input.creditMemoId)}`,
            retries: 3
        });

        if (!response.data || (typeof response.data === 'object' && 'fault' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Credit memo with ID '${input.creditMemoId}' not found`,
                creditMemoId: input.creditMemoId
            });
        }

        // QuickBooks wraps the response in a CreditMemo key
        const ResponseSchema = z.object({
            CreditMemo: ProviderCreditMemoSchema
        });

        const parsed = ResponseSchema.parse(response.data);
        const creditMemo = parsed.CreditMemo;

        return {
            id: creditMemo.Id,
            ...(creditMemo.DocNumber !== undefined && { docNumber: creditMemo.DocNumber }),
            ...(creditMemo.TxnDate !== undefined && { txnDate: creditMemo.TxnDate }),
            ...(creditMemo.PrivateNote !== undefined && { privateNote: creditMemo.PrivateNote }),
            ...(creditMemo.TotalAmt !== undefined && { totalAmount: creditMemo.TotalAmt }),
            ...(creditMemo.Balance !== undefined && { balance: creditMemo.Balance }),
            ...(creditMemo.Status !== undefined && { status: creditMemo.Status }),
            ...(creditMemo.CustomerRef?.value !== undefined && { customerId: creditMemo.CustomerRef.value }),
            ...(creditMemo.CustomerRef?.name !== undefined && { customerName: creditMemo.CustomerRef.name }),
            ...(creditMemo.Memo !== undefined && { memo: creditMemo.Memo }),
            ...(creditMemo.MetaData?.CreateTime !== undefined && { createdTime: creditMemo.MetaData.CreateTime }),
            ...(creditMemo.MetaData?.LastUpdatedTime !== undefined && { lastUpdatedTime: creditMemo.MetaData.LastUpdatedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
