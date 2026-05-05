import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the account. Example: "1"')
});

const ProviderAccountSchema = z.object({
    Id: z.string(),
    Name: z.string(),
    AccountType: z.string().optional(),
    AccountSubType: z.string().optional(),
    AcctNum: z.string().optional(),
    Active: z.boolean().optional(),
    Classification: z.string().optional(),
    CurrentBalance: z.number().optional(),
    CurrentBalanceWithSubAccounts: z.number().optional(),
    Description: z.string().optional(),
    FullyQualifiedName: z.string().optional(),
    SubAccount: z.boolean().optional(),
    SyncToken: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    MetaData: z
        .object({
            CreateTime: z.string().optional(),
            LastUpdatedTime: z.string().optional()
        })
        .optional(),
    ParentRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    CurrencyRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const ApiResponseSchema = z.object({
    Account: ProviderAccountSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountType: z.string().optional(),
    accountSubType: z.string().optional(),
    accountNumber: z.string().optional(),
    active: z.boolean().optional(),
    classification: z.string().optional(),
    currentBalance: z.number().optional(),
    currentBalanceWithSubAccounts: z.number().optional(),
    description: z.string().optional(),
    fullyQualifiedName: z.string().optional(),
    subAccount: z.boolean().optional(),
    syncToken: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    metadata: z
        .object({
            createTime: z.string().optional(),
            lastUpdatedTime: z.string().optional()
        })
        .optional(),
    parentRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    currencyRef: z
        .object({
            value: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

async function getRealmId(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
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
    description: 'Retrieve an account by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
        const response = await nango.get({
            endpoint: `/v3/company/${realmId}/account/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found',
                id: input.id
            });
        }

        const parsed = ApiResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data['Account']) {
            const account = parsed.data['Account'];

            return {
                id: account.Id,
                name: account.Name,
                ...(account.AccountType !== undefined && { accountType: account.AccountType }),
                ...(account.AccountSubType !== undefined && { accountSubType: account.AccountSubType }),
                ...(account.AcctNum !== undefined && { accountNumber: account.AcctNum }),
                ...(account.Active !== undefined && { active: account.Active }),
                ...(account.Classification !== undefined && { classification: account.Classification }),
                ...(account.CurrentBalance !== undefined && { currentBalance: account.CurrentBalance }),
                ...(account.CurrentBalanceWithSubAccounts !== undefined && { currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts }),
                ...(account.Description !== undefined && { description: account.Description }),
                ...(account.FullyQualifiedName !== undefined && { fullyQualifiedName: account.FullyQualifiedName }),
                ...(account.SubAccount !== undefined && { subAccount: account.SubAccount }),
                ...(account.SyncToken !== undefined && { syncToken: account.SyncToken }),
                ...(account.domain !== undefined && { domain: account.domain }),
                ...(account.sparse !== undefined && { sparse: account.sparse }),
                ...(account.MetaData !== undefined && {
                    metadata: {
                        ...(account.MetaData.CreateTime !== undefined && { createTime: account.MetaData.CreateTime }),
                        ...(account.MetaData.LastUpdatedTime !== undefined && { lastUpdatedTime: account.MetaData.LastUpdatedTime })
                    }
                }),
                ...(account.ParentRef !== undefined && { parentRef: account.ParentRef }),
                ...(account.CurrencyRef !== undefined && { currencyRef: account.CurrencyRef })
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response format from QuickBooks API',
            id: input.id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
