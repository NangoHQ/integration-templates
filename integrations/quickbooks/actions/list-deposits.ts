import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page. Example: "1"')
});

const DepositLineSchema = z.object({
    Id: z.string().optional(),
    LineNum: z.number().optional(),
    Description: z.string().optional(),
    Amount: z.number().optional(),
    DetailType: z.string().optional(),
    LinkedTxn: z
        .array(
            z.object({
                TxnId: z.string().optional(),
                TxnType: z.string().optional()
            })
        )
        .optional()
});

const DepositToAccountRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const CurrencyRefSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional()
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ProviderDepositSchema = z.object({
    Id: z.string(),
    SyncToken: z.string().optional(),
    MetaData: MetaDataSchema.optional(),
    TxnDate: z.string().optional(),
    TotalAmt: z.number().optional(),
    DepositToAccountRef: DepositToAccountRefSchema.optional(),
    CurrencyRef: CurrencyRefSchema.optional(),
    PrivateNote: z.string().optional(),
    Line: z.array(DepositLineSchema).optional()
});

const QueryResponseSchema = z.object({
    Deposit: z.array(ProviderDepositSchema).optional(),
    totalCount: z.number().optional(),
    startPosition: z.number().optional(),
    maxResults: z.number().optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const DepositSchema = z.object({
    id: z.string(),
    sync_token: z.string().optional(),
    transaction_date: z.string().optional(),
    total_amount: z.number().optional(),
    deposit_to_account_id: z.string().optional(),
    deposit_to_account_name: z.string().optional(),
    currency_code: z.string().optional(),
    private_note: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    deposits: z.array(DepositSchema),
    next_cursor: z.string().optional()
});

function mapProviderDepositToDeposit(providerDeposit: z.infer<typeof ProviderDepositSchema>): z.infer<typeof DepositSchema> {
    return {
        id: providerDeposit.Id,
        ...(providerDeposit.SyncToken !== undefined && { sync_token: providerDeposit.SyncToken }),
        ...(providerDeposit.TxnDate !== undefined && { transaction_date: providerDeposit.TxnDate }),
        ...(providerDeposit.TotalAmt !== undefined && { total_amount: providerDeposit.TotalAmt }),
        ...(providerDeposit.DepositToAccountRef?.value !== undefined && {
            deposit_to_account_id: providerDeposit.DepositToAccountRef.value
        }),
        ...(providerDeposit.DepositToAccountRef?.name !== undefined && {
            deposit_to_account_name: providerDeposit.DepositToAccountRef.name
        }),
        ...(providerDeposit.CurrencyRef?.value !== undefined && { currency_code: providerDeposit.CurrencyRef.value }),
        ...(providerDeposit.PrivateNote !== undefined && { private_note: providerDeposit.PrivateNote }),
        ...(providerDeposit.MetaData?.CreateTime !== undefined && { created_at: providerDeposit.MetaData.CreateTime }),
        ...(providerDeposit.MetaData?.LastUpdatedTime !== undefined && { updated_at: providerDeposit.MetaData.LastUpdatedTime })
    };
}

async function getCompanyRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];

    if (typeof realmId !== 'string' || realmId.length === 0) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }

    return realmId;
}

const action = createAction({
    description: 'List deposits with the QuickBooks query endpoint.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompanyRealmId(nango);

        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid cursor value. Cursor must be a positive integer.',
                    cursor: input.cursor
                });
            }
            startPosition = n;
        }
        const maxResults = 100;

        // https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/data-queries
        const query = `SELECT * FROM Deposit STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        const response = await nango.post({
            // https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/data-queries
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query: query
            },
            headers: {
                'Content-Type': 'text/plain'
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse QuickBooks API response',
                details: parsedResponse.error.message
            });
        }

        const deposits = parsedResponse.data.QueryResponse.Deposit ?? [];
        const mappedDeposits = deposits.map(mapProviderDepositToDeposit);

        let nextCursor: string | undefined;
        if (deposits.length === maxResults) {
            nextCursor = String(startPosition + maxResults);
        }

        return {
            deposits: mappedDeposits,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
