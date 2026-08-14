import { z } from 'zod';
import { createAction } from 'nango';

type NangoActionParam = Parameters<Parameters<typeof createAction>[0]['exec']>[0];

const InputSchema = z
    .object({
        where: z.string().optional().describe('Xero where clause to filter accounts. Example: \'Type=="BANK"\''),
        order: z.string().optional().describe("Order by clause. Example: 'Name ASC'")
    })
    .describe('Input parameters for listing Xero chart of accounts entries.');

const AccountSchema = z
    .object({
        AccountID: z.string().describe('Unique identifier for the account. Example: 00000000-0000-0000-0000-000000000000'),
        Code: z.string().describe('Customer defined alpha-numeric account code. Example: 200'),
        Name: z.string().describe('Name of the account. Example: Sales'),
        Type: z.string().describe('The type of the account. See Account Types. Example: BANK'),
        BankAccountNumber: z.string().optional().describe('Bank account number if the account is a bank account. Example: 123456789'),
        Status: z.string().describe('Status of the account. Example: ACTIVE'),
        Description: z.string().optional().describe('Description of the account. Example: Revenue from sales'),
        TaxType: z.string().optional().describe('The tax type from TaxRates. Example: OUTPUT'),
        Class: z.string().describe('The class of the account. Example: REVENUE'),
        EnablePaymentsToAccount: z.boolean().optional().describe('Boolean to indicate if the account can have payments applied to it.'),
        ShowInExpenseClaims: z.boolean().optional().describe('Boolean to indicate if the account can be used in expense claims.'),
        BankAccountType: z.string().optional().describe('Bank account type if the account is a bank account. Example: CHECKING'),
        CurrencyCode: z.string().optional().describe('Currency code if the account is a bank account. Example: USD'),
        ReportingCode: z.string().optional().describe('Reporting code for the account. Example: REV.TRA'),
        ReportingCodeName: z.string().optional().describe('Name of the reporting code. Example: Trade Revenue'),
        HasAttachments: z.boolean().optional().describe('Boolean to indicate if the account has attachments.'),
        UpdatedDateUTC: z.string().optional().describe('Last modified date in UTC. Example: 2023-01-01T00:00:00.000Z')
    })
    .passthrough();

const OutputSchema = z
    .object({
        Accounts: z.array(AccountSchema).describe('Array of accounts from the Xero chart of accounts.')
    })
    .describe('Output containing the list of accounts from the Xero chart of accounts.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ConnectionsSchema = z.array(
    z
        .object({
            id: z.string(),
            tenantId: z.string().optional(),
            tenantName: z.string().optional()
        })
        .passthrough()
);

/**
 * Resolves the Xero tenant ID to use for API requests.
 */
async function resolveTenantId(nango: NangoActionParam): Promise<string> {
    const connection = ConnectionSchema.parse(await nango.getConnection());

    let tenantId: string | undefined;

    const configTenantId = connection.connection_config?.['tenant_id'];
    if (configTenantId !== undefined) {
        const parsed = z.string().safeParse(configTenantId);
        if (parsed.success && parsed.data.length > 0) {
            tenantId = parsed.data;
        }
    }

    if (!tenantId) {
        const metadataTenantId = connection.metadata?.['tenantId'];
        if (metadataTenantId !== undefined) {
            const parsed = z.string().safeParse(metadataTenantId);
            if (parsed.success && parsed.data.length > 0) {
                tenantId = parsed.data;
            }
        }
    }

    if (!tenantId) {
        // https://developer.xero.com/documentation/api/overview/connections
        const response = await nango.get({
            endpoint: 'connections',
            retries: 10
        });

        const connections = ConnectionsSchema.parse(response.data);
        if (connections.length === 0) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'No Xero tenants found for this connection.'
            });
        }

        if (connections.length > 1) {
            throw new nango.ActionError({
                type: 'multiple_tenants',
                message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
            });
        }

        const first = connections[0];
        if (first && typeof first.tenantId === 'string' && first.tenantId.length > 0) {
            tenantId = first.tenantId;
        }
    }

    if (!tenantId) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'Unable to resolve xero-tenant-id.'
        });
    }

    return tenantId;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of accounts from the Xero chart of accounts.
 * @pitfalls: UpdatedDateUTC is returned in Microsoft JSON Date format (/Date(...)/) rather than ISO 8601, and bank-specific fields such as BankAccountType may appear as empty strings on non-bank accounts.
 */
const action = createAction({
    description: 'List accounts in the Xero chart of accounts.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const params: Record<string, string> = {};
        if (input['where'] !== undefined) {
            params['where'] = input['where'];
        }
        if (input['order'] !== undefined) {
            params['order'] = input['order'];
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenantId
            },
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            Accounts: z.array(z.unknown())
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const accounts = parsedResponse.Accounts.map((item) => AccountSchema.parse(item));

        return {
            Accounts: accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
