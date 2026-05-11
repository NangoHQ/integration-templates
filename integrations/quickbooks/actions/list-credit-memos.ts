import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (start position). Omit for the first page.'),
    updated_after: z.string().optional().describe('Filter by records updated after this ISO timestamp. Example: "2024-01-01T00:00:00Z"')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ReferenceSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const LineSchema = z
    .object({
        Id: z.string().optional(),
        LineNum: z.union([z.string(), z.number()]).optional(),
        Description: z.string().optional(),
        Amount: z.number().optional(),
        DetailType: z.string().optional(),
        SalesItemLineDetail: z
            .object({
                ItemRef: ReferenceSchema.optional(),
                UnitPrice: z.number().optional(),
                Qty: z.number().optional(),
                TaxCodeRef: ReferenceSchema.optional()
            })
            .optional(),
        SubTotalLineDetail: z.object({}).optional()
    })
    .passthrough();

const ProviderCreditMemoSchema = z
    .object({
        Id: z.string(),
        DocNumber: z.string().optional(),
        TxnDate: z.string().optional(),
        CustomerRef: ReferenceSchema.optional(),
        CurrencyRef: ReferenceSchema.optional(),
        TotalAmt: z.number().optional(),
        Balance: z.number().optional(),
        Line: z.array(LineSchema).optional(),
        MetaData: MetaDataSchema.optional(),
        status: z.string().optional()
    })
    .passthrough();

const QueryResponseSchema = z.object({
    CreditMemo: z.array(ProviderCreditMemoSchema).optional(),
    maxResults: z.number().optional(),
    startPosition: z.number().optional(),
    totalCount: z.number().optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const CreditMemoSchema = z.object({
    id: z.string(),
    doc_number: z.string().optional(),
    txn_date: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    currency_code: z.string().optional(),
    total_amount: z.number().optional(),
    balance: z.number().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(CreditMemoSchema),
    next_cursor: z.string().optional()
});

function mapProviderToOutput(provider: z.infer<typeof ProviderCreditMemoSchema>): z.infer<typeof CreditMemoSchema> {
    return {
        id: provider.Id,
        ...(provider.DocNumber !== undefined && { doc_number: provider.DocNumber }),
        ...(provider.TxnDate !== undefined && { txn_date: provider.TxnDate }),
        ...(provider.CustomerRef?.value !== undefined && { customer_id: provider.CustomerRef.value }),
        ...(provider.CustomerRef?.name !== undefined && { customer_name: provider.CustomerRef.name }),
        ...(provider.CurrencyRef?.value !== undefined && { currency_code: provider.CurrencyRef.value }),
        ...(provider.TotalAmt !== undefined && { total_amount: provider.TotalAmt }),
        ...(provider.Balance !== undefined && { balance: provider.Balance }),
        ...(provider.status !== undefined && { status: provider.status }),
        ...(provider.MetaData?.CreateTime !== undefined && { created_at: provider.MetaData.CreateTime }),
        ...(provider.MetaData?.LastUpdatedTime !== undefined && { updated_at: provider.MetaData.LastUpdatedTime })
    };
}

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'List QuickBooks credit memos.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-credit-memos',
        group: 'Credit Memos'
    },
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const realmId = await getRealmId(nango);
        const startPosition = input.cursor ? parseInt(input.cursor, 10) : 1;
        const maxResults = 100;

        let whereClause = '';
        if (input.updated_after) {
            whereClause = ` WHERE MetaData.LastUpdatedTime > '${input.updated_after}'`;
        }

        const query = `SELECT * FROM CreditMemo${whereClause} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo#query-a-credit-memo
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: { query },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const creditMemos = parsed.QueryResponse.CreditMemo ?? [];

        const items = creditMemos.map(mapProviderToOutput);

        const nextCursor = creditMemos.length === maxResults ? String(startPosition + maxResults) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
