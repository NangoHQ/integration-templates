import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page.')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const CustomerRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const EstimateLineSchema = z
    .object({
        Id: z.string().optional(),
        LineNum: z.union([z.string(), z.number()]).optional(),
        Description: z.string().optional(),
        Amount: z.number().optional(),
        DetailType: z.string().optional()
    })
    .passthrough();

const ProviderEstimateSchema = z.object({
    Id: z.string(),
    DocNumber: z.string().optional(),
    TxnDate: z.string().optional(),
    CustomerRef: CustomerRefSchema.optional(),
    TotalAmt: z.number().optional(),
    MetaData: MetaDataSchema.optional(),
    Line: z.array(EstimateLineSchema).optional(),
    BillEmail: z.object({ Address: z.string().optional() }).optional(),
    BillAddr: z.object({}).passthrough().optional(),
    ShipAddr: z.object({}).passthrough().optional(),
    PrivateNote: z.string().optional(),
    CustomerMemo: z.object({ value: z.string().optional() }).optional(),
    TxnStatus: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    SyncToken: z.string().optional()
});

const QueryResponseSchema = z.object({
    Estimate: z.array(ProviderEstimateSchema).optional(),
    startPosition: z.number().optional(),
    maxResults: z.number().optional(),
    totalCount: z.number().optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const EstimateOutputSchema = z.object({
    id: z.string(),
    doc_number: z.string().optional(),
    txn_date: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    total_amount: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.string().optional(),
    private_note: z.string().optional(),
    customer_memo: z.string().optional(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    estimates: z.array(EstimateOutputSchema),
    next_cursor: z.string().optional()
});

async function getCompany(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'List estimates with the QuickBooks query endpoint',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        const maxResults = 100;
        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a positive integer.' });
            }
            startPosition = n;
        }

        const query = `SELECT * FROM Estimate STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/estimate#query-an-estimate
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query: query
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const estimates = parsed.QueryResponse.Estimate ?? [];
        const totalCount = parsed.QueryResponse.totalCount ?? 0;

        const mappedEstimates = estimates.map((estimate) => ({
            id: estimate.Id,
            ...(estimate.DocNumber !== undefined && { doc_number: estimate.DocNumber }),
            ...(estimate.TxnDate !== undefined && { txn_date: estimate.TxnDate }),
            ...(estimate.CustomerRef?.value !== undefined && { customer_id: estimate.CustomerRef.value }),
            ...(estimate.CustomerRef?.name !== undefined && { customer_name: estimate.CustomerRef.name }),
            ...(estimate.TotalAmt !== undefined && { total_amount: estimate.TotalAmt }),
            ...(estimate.MetaData?.CreateTime !== undefined && { created_at: estimate.MetaData.CreateTime }),
            ...(estimate.MetaData?.LastUpdatedTime !== undefined && { updated_at: estimate.MetaData.LastUpdatedTime }),
            ...(estimate.TxnStatus !== undefined && { status: estimate.TxnStatus }),
            ...(estimate.PrivateNote !== undefined && { private_note: estimate.PrivateNote }),
            ...(estimate.CustomerMemo?.value !== undefined && { customer_memo: estimate.CustomerMemo.value }),
            ...(estimate.BillEmail?.Address !== undefined && { email: estimate.BillEmail.Address })
        }));

        const nextPosition = startPosition + estimates.length;
        const hasMore = estimates.length === maxResults && nextPosition <= totalCount;

        return {
            estimates: mappedEstimates,
            ...(hasMore && { next_cursor: String(nextPosition) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
