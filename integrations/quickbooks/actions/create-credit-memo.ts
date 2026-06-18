import { z } from 'zod';
import { createAction } from 'nango';

const RefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const SalesItemLineDetailSchema = z.object({
    ItemRef: RefSchema,
    UnitPrice: z.number().optional(),
    Qty: z.number().optional(),
    TaxCodeRef: RefSchema.optional()
});

const LineSchema = z.object({
    Amount: z.number(),
    DetailType: z.string(),
    Description: z.string().optional(),
    SalesItemLineDetail: SalesItemLineDetailSchema.optional()
});

const InputSchema = z.object({
    CustomerRef: RefSchema,
    Line: z.array(LineSchema),
    TxnDate: z.string().optional(),
    DocNumber: z.string().optional(),
    PrivateNote: z.string().optional(),
    CustomerMemo: z
        .object({
            value: z.string()
        })
        .optional(),
    BillEmail: z
        .object({
            Address: z.string()
        })
        .optional(),
    CurrencyRef: RefSchema.optional(),
    ProjectRef: RefSchema.optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const CreditMemoLineSchema = z.object({
    Id: z.string().optional(),
    LineNum: z.number().optional(),
    Description: z.string().optional(),
    Amount: z.number(),
    DetailType: z.string(),
    SalesItemLineDetail: SalesItemLineDetailSchema.optional()
});

const OutputSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    MetaData: MetaDataSchema,
    DocNumber: z.string().optional(),
    TxnDate: z.string(),
    PrivateNote: z.string().optional(),
    Line: z.array(CreditMemoLineSchema),
    CustomerRef: RefSchema,
    CustomerMemo: z
        .object({
            value: z.string()
        })
        .optional(),
    TotalAmt: z.number(),
    RemainingCredit: z.number().optional(),
    Balance: z.number().optional()
});

async function getCompany(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId.'
        });
    }
    return realmId;
}

const ApiResponseSchema = z.object({
    CreditMemo: OutputSchema
});

const action = createAction({
    description: 'Create a QuickBooks credit memo.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/creditmemo`,
            data: input,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from QuickBooks API'
            });
        }

        const parsed = ApiResponseSchema.parse(response.data);
        return parsed.CreditMemo;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
