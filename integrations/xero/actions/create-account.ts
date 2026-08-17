import { z } from 'zod';
import { createAction } from 'nango';

const AccountTypeEnum = z.enum([
    'BANK',
    'CURRENT',
    'CURRLIAB',
    'DEPRECIATN',
    'DIRECTCOSTS',
    'EQUITY',
    'EXPENSE',
    'FIXED',
    'INVENTORY',
    'LIABILITY',
    'NONCURRENT',
    'OTHERINCOME',
    'OVERHEADS',
    'PREPAYMENT',
    'REVENUE',
    'SALES',
    'TERMLIAB',
    'PAYGLIABILITY'
]);

const InputSchema = z
    .object({
        Code: z.string().describe('Unique account code within the organisation. Example: "200"'),
        Name: z.string().describe('Name of the account. Example: "Sales"'),
        Type: AccountTypeEnum.describe('Account classification. BANK requires BankAccountNumber.'),
        BankAccountNumber: z.string().optional().describe('Bank account number. Required when Type is BANK.'),
        BankAccountType: z.string().optional().describe('Bank account subtype, e.g. CHECKING. The API may normalize this value.'),
        CurrencyCode: z.string().optional().describe('ISO 4217 currency code, e.g. USD.')
    })
    .describe('Input to create a Xero chart-of-accounts entry, including bank accounts.');

const OutputSchema = z
    .object({
        AccountID: z.string().describe('Unique Xero identifier for the created account.'),
        Code: z.string().describe('Account code.'),
        Name: z.string().describe('Account name.'),
        Type: z.string().describe('Account type.'),
        BankAccountNumber: z.string().optional().describe('Bank account number, if set.'),
        BankAccountType: z.string().optional().describe('Bank account type. May differ from the submitted value.'),
        CurrencyCode: z.string().optional().describe('Currency code, if set.'),
        Status: z.string().optional().describe('Account status, e.g. ACTIVE.'),
        Description: z.string().optional().describe('Account description.')
    })
    .describe('The account as returned by the Xero API after creation.');

const ProviderAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string(),
    Name: z.string(),
    Type: z.string(),
    BankAccountNumber: z.string().optional(),
    BankAccountType: z.string().optional(),
    CurrencyCode: z.string().optional(),
    Status: z.string().optional(),
    Description: z.string().optional()
});

const ProviderResponseSchema = z.object({
    Accounts: z.array(z.unknown())
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown()))
});

/**
 * @tags: [write]
 * @tagReason: Creates a new account in the Xero chart of accounts.
 * @pitfalls: Code is limited to 10 characters and must be unique across the organisation; Name must also be unique. For Type=BANK, the submitted BankAccountType may be silently normalized (e.g. CHECKING returned as BANK).
 */
const action = createAction({
    description: 'Create an account in the Xero chart of accounts (including bank accounts).',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.Type === 'BANK' && !input.BankAccountNumber) {
            throw new nango.ActionError({
                type: 'missing_field',
                message: 'BankAccountNumber is required when Type is BANK.'
            });
        }

        const connection = await nango.getConnection();
        const safeConnection = ConnectionSchema.parse(connection);
        const configTenantId = safeConnection['connection_config']?.['tenant_id'];
        const metaTenantId = safeConnection['metadata']?.['tenantId'];

        let tenantId: string | undefined;
        if (typeof configTenantId === 'string' && configTenantId.length > 0) {
            tenantId = configTenantId;
        } else if (typeof metaTenantId === 'string' && metaTenantId.length > 0) {
            tenantId = metaTenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const safeConnections = ConnectionsResponseSchema.parse(connectionsResponse);
            if (safeConnections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            } else if (safeConnections.data.length === 1) {
                const first = safeConnections.data[0];
                const firstTenantId = first?.['tenantId'];
                if (typeof firstTenantId === 'string') {
                    tenantId = firstTenantId;
                }
            } else {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const payload: Record<string, unknown> = {
            Code: input.Code,
            Name: input.Name,
            Type: input.Type,
            ...(input.BankAccountNumber !== undefined && { BankAccountNumber: input.BankAccountNumber }),
            ...(input.BankAccountType !== undefined && { BankAccountType: input.BankAccountType }),
            ...(input.CurrencyCode !== undefined && { CurrencyCode: input.CurrencyCode })
        };

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: {
                Accounts: [payload]
            },
            retries: 3
        });

        const safeResponse = ProviderResponseSchema.parse(response.data);
        if (!Array.isArray(safeResponse.Accounts) || safeResponse.Accounts.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty Accounts array.'
            });
        }

        const rawAccount = safeResponse.Accounts[0];
        if (rawAccount === null || rawAccount === undefined) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned a null account in the Accounts array.'
            });
        }

        const account = ProviderAccountSchema.parse(rawAccount);

        return {
            AccountID: account.AccountID,
            Code: account.Code,
            Name: account.Name,
            Type: account.Type,
            ...(account.BankAccountNumber !== undefined && { BankAccountNumber: account.BankAccountNumber }),
            ...(account.BankAccountType !== undefined && { BankAccountType: account.BankAccountType }),
            ...(account.CurrencyCode !== undefined && { CurrencyCode: account.CurrencyCode }),
            ...(account.Status !== undefined && { Status: account.Status }),
            ...(account.Description !== undefined && { Description: account.Description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
