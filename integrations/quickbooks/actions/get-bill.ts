import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Bill ID. Example: "123"')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const LineAccountBasedExpenseLineDetailSchema = z.object({
    AccountRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    BillableStatus: z.string().optional(),
    TaxCodeRef: z
        .object({
            value: z.string().optional()
        })
        .optional()
});

const LineSchema = z.object({
    Id: z.string().optional(),
    LineNum: z.number().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.string(),
    AccountBasedExpenseLineDetail: LineAccountBasedExpenseLineDetailSchema.optional()
});

const VendorRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const APAccountRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const CurrencyRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const BillProviderSchema = z.object({
    Id: z.string(),
    VendorRef: VendorRefSchema,
    APAccountRef: APAccountRefSchema.optional(),
    CurrencyRef: CurrencyRefSchema.optional(),
    Line: z.array(LineSchema),
    TotalAmt: z.number(),
    TxnDate: z.string().optional(),
    DueDate: z.string().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    MetaData: MetaDataSchema.optional(),
    SyncToken: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    vendor_id: z.string(),
    vendor_name: z.string().optional(),
    ap_account_id: z.string().optional(),
    ap_account_name: z.string().optional(),
    currency_code: z.string().optional(),
    currency_name: z.string().optional(),
    lines: z.array(
        z.object({
            id: z.string().optional(),
            line_num: z.number().optional(),
            description: z.string().optional(),
            amount: z.number(),
            detail_type: z.string(),
            account_id: z.string().optional(),
            account_name: z.string().optional(),
            billable_status: z.string().optional()
        })
    ),
    total_amount: z.number(),
    transaction_date: z.string().optional(),
    due_date: z.string().optional(),
    doc_number: z.string().optional(),
    private_note: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    sync_token: z.string().optional()
});

async function getCompany(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
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

const action = createAction({
    description: 'Retrieve a bill by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/bill/${encodeURIComponent(input.id)}`,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        if (!response.data || !response.data['Bill']) {
            throw new Error(`Bill with ID ${input.id} not found`);
        }

        const bill = BillProviderSchema.parse(response.data['Bill']);

        return {
            id: bill.Id,
            vendor_id: bill.VendorRef.value,
            ...(bill.VendorRef.name !== undefined && { vendor_name: bill.VendorRef.name }),
            ...(bill.APAccountRef?.value !== undefined && { ap_account_id: bill.APAccountRef.value }),
            ...(bill.APAccountRef?.name !== undefined && { ap_account_name: bill.APAccountRef.name }),
            ...(bill.CurrencyRef?.value !== undefined && { currency_code: bill.CurrencyRef.value }),
            ...(bill.CurrencyRef?.name !== undefined && { currency_name: bill.CurrencyRef.name }),
            lines: bill.Line.map((line) => ({
                ...(line.Id !== undefined && { id: line.Id }),
                ...(line.LineNum !== undefined && { line_num: line.LineNum }),
                ...(line.Description !== undefined && { description: line.Description }),
                amount: line.Amount,
                detail_type: line.DetailType,
                ...(line.AccountBasedExpenseLineDetail?.AccountRef?.value !== undefined && {
                    account_id: line.AccountBasedExpenseLineDetail.AccountRef.value
                }),
                ...(line.AccountBasedExpenseLineDetail?.AccountRef?.name !== undefined && {
                    account_name: line.AccountBasedExpenseLineDetail.AccountRef.name
                }),
                ...(line.AccountBasedExpenseLineDetail?.BillableStatus !== undefined && {
                    billable_status: line.AccountBasedExpenseLineDetail.BillableStatus
                })
            })),
            total_amount: bill.TotalAmt,
            ...(bill.TxnDate !== undefined && { transaction_date: bill.TxnDate }),
            ...(bill.DueDate !== undefined && { due_date: bill.DueDate }),
            ...(bill.DocNumber !== undefined && { doc_number: bill.DocNumber }),
            ...(bill.PrivateNote !== undefined && { private_note: bill.PrivateNote }),
            ...(bill.MetaData?.CreateTime !== undefined && { created_at: bill.MetaData.CreateTime }),
            ...(bill.MetaData?.LastUpdatedTime !== undefined && { updated_at: bill.MetaData.LastUpdatedTime }),
            ...(bill.SyncToken !== undefined && { sync_token: bill.SyncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
