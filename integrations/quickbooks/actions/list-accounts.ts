import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for list-accounts action
const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results to return. Default: 100, Max: 1000.')
});

// QuickBooks Account schema from API response
const AccountSchema = z.object({
    Id: z.string(),
    Name: z.string(),
    AccountType: z.string(),
    AccountSubType: z.string().optional(),
    Classification: z.string().optional(),
    FullyQualifiedName: z.string().optional(),
    Active: z.boolean().optional(),
    CurrentBalance: z.number().optional(),
    CurrentBalanceWithSubAccounts: z.number().optional(),
    CurrencyRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    MetaData: z
        .object({
            CreateTime: z.string(),
            LastUpdatedTime: z.string()
        })
        .optional()
});

const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        Account: z.array(AccountSchema).optional(),
        startPosition: z.number().optional(),
        maxResults: z.number().optional(),
        totalCount: z.number().optional()
    })
});

// Output schema for mapped accounts
const AccountOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountType: z.string(),
    accountSubType: z.string().optional(),
    classification: z.string().optional(),
    fullyQualifiedName: z.string().optional(),
    active: z.boolean().optional(),
    currentBalance: z.number().optional(),
    currentBalanceWithSubAccounts: z.number().optional(),
    currency: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    accounts: z.array(AccountOutputSchema),
    nextCursor: z.string().optional(),
    totalCount: z.number().optional()
});

async function getCompanyRealmId(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const connectionConfig = connection.connection_config;
    if (!connectionConfig) {
        throw new nango.ActionError({
            type: 'missing_connection_config',
            message: 'Connection configuration not found. Please check your connection setup.'
        });
    }
    const realmId = connectionConfig['realmId'];
    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

function mapAccount(account: z.infer<typeof AccountSchema>): z.infer<typeof AccountOutputSchema> {
    return {
        id: account.Id,
        name: account.Name,
        accountType: account.AccountType,
        ...(account.AccountSubType !== undefined && { accountSubType: account.AccountSubType }),
        ...(account.Classification !== undefined && { classification: account.Classification }),
        ...(account.FullyQualifiedName !== undefined && { fullyQualifiedName: account.FullyQualifiedName }),
        ...(account.Active !== undefined && { active: account.Active }),
        ...(account.CurrentBalance !== undefined && { currentBalance: account.CurrentBalance }),
        ...(account.CurrentBalanceWithSubAccounts !== undefined && { currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts }),
        ...(account.CurrencyRef?.value !== undefined && { currency: account.CurrencyRef.value }),
        ...(account.MetaData?.CreateTime !== undefined && { createdAt: account.MetaData.CreateTime }),
        ...(account.MetaData?.LastUpdatedTime !== undefined && { updatedAt: account.MetaData.LastUpdatedTime })
    };
}

const action = createAction({
    description: 'List accounts with the QuickBooks query endpoint',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompanyRealmId(nango);

        const limit = Math.min(input.limit ?? 100, 1000);
        if (limit < 1) {
            throw new nango.ActionError({ type: 'invalid_limit', message: 'Limit must be a positive integer.' });
        }

        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid cursor value. Cursor must be a positive integer representing STARTPOSITION.'
                });
            }
            startPosition = n;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account#query-an-account
        const query = `SELECT * FROM Account STARTPOSITION ${startPosition} MAXRESULTS ${limit}`;

        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            headers: {
                'Content-Type': 'text/plain'
            },
            params: {
                query: query
            },
            retries: 3
        });

        const parsedResponse = QueryResponseSchema.parse(response.data);
        const accounts = parsedResponse.QueryResponse.Account ?? [];
        const totalCount = parsedResponse.QueryResponse.totalCount;

        const hasMore = accounts.length === limit;
        const nextCursor = hasMore ? String(startPosition + limit) : undefined;

        return {
            accounts: accounts.map(mapAccount),
            ...(nextCursor !== undefined && { nextCursor }),
            ...(totalCount !== undefined && { totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
