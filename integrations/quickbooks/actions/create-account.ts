import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the account. Example: "My Account"'),
    accountType: z
        .enum([
            'Bank',
            'Other Current Asset',
            'Fixed Asset',
            'Other Asset',
            'Accounts Receivable',
            'Equity',
            'Expense',
            'Other Expense',
            'Cost of Goods Sold',
            'Accounts Payable',
            'Credit Card',
            'Long Term Liability',
            'Other Current Liability',
            'Income',
            'Other Income'
        ])
        .describe('Account classification type'),
    accountSubType: z.string().optional().describe('Detailed account type'),
    description: z.string().optional().describe('Description of the account'),
    currencyRef: z
        .object({
            value: z.string().describe('Currency code'),
            name: z.string().optional().describe('Currency name')
        })
        .optional()
        .describe('Currency reference')
});

const ProviderAccountResponseSchema = z.object({
    Account: z.object({
        Id: z.string(),
        Name: z.string(),
        AccountType: z.string(),
        AccountSubType: z.string().optional(),
        Description: z.string().optional(),
        CurrencyRef: z
            .object({
                value: z.string(),
                name: z.string().optional()
            })
            .optional(),
        Active: z.boolean().optional(),
        CurrentBalance: z.number().optional(),
        CurrentBalanceWithSubAccounts: z.number().optional(),
        SyncToken: z.string().optional(),
        MetaData: z
            .object({
                CreateTime: z.string().optional(),
                LastUpdatedTime: z.string().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountType: z.string(),
    accountSubType: z.string().optional(),
    description: z.string().optional(),
    currencyCode: z.string().optional(),
    active: z.boolean().optional(),
    currentBalance: z.number().optional(),
    currentBalanceWithSubAccounts: z.number().optional(),
    syncToken: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a QuickBooks Online chart of accounts entry.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const realmId = connection.connection_config['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'missing_realm_id',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const requestBody: Record<string, unknown> = {
            Name: input.name,
            AccountType: input.accountType
        };

        if (input.accountSubType !== undefined) {
            requestBody['AccountSubType'] = input.accountSubType;
        }

        if (input.description !== undefined) {
            requestBody['Description'] = input.description;
        }

        if (input.currencyRef !== undefined) {
            requestBody['CurrencyRef'] = {
                value: input.currencyRef.value,
                ...(input.currencyRef.name !== undefined && { name: input.currencyRef.name })
            };
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/account`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create account: empty response from QuickBooks API'
            });
        }

        const parsed = ProviderAccountResponseSchema.parse(response.data);
        const account = parsed.Account;

        return {
            id: account.Id,
            name: account.Name,
            accountType: account.AccountType,
            ...(account.AccountSubType !== undefined && { accountSubType: account.AccountSubType }),
            ...(account.Description !== undefined && { description: account.Description }),
            ...(account.CurrencyRef?.value !== undefined && { currencyCode: account.CurrencyRef.value }),
            ...(account.Active !== undefined && { active: account.Active }),
            ...(account.CurrentBalance !== undefined && { currentBalance: account.CurrentBalance }),
            ...(account.CurrentBalanceWithSubAccounts !== undefined && {
                currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts
            }),
            ...(account.SyncToken !== undefined && { syncToken: account.SyncToken }),
            ...(account.MetaData?.CreateTime !== undefined && { createdAt: account.MetaData.CreateTime }),
            ...(account.MetaData?.LastUpdatedTime !== undefined && { updatedAt: account.MetaData.LastUpdatedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
