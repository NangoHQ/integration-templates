import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        accountId: z.string().describe('The unique Xero AccountID. Example: "00000000-0000-0000-0000-000000000000"')
    })
    .describe('Input for retrieving a Xero account by AccountID.');

const ProviderAccountSchema = z.object({
    AccountID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Status: z.string().optional(),
    Type: z.string().optional(),
    TaxType: z.string().optional(),
    Class: z.string().optional(),
    EnablePaymentsToAccount: z.boolean().optional(),
    ShowInExpenseClaims: z.boolean().optional(),
    BankAccountType: z.string().optional(),
    ReportingCode: z.string().optional(),
    ReportingCodeName: z.string().optional(),
    HasAttachments: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    AddToWatchlist: z.boolean().optional()
});

const OutputSchema = z
    .object({
        accountId: z.string().describe('The unique Xero AccountID.'),
        code: z.string().optional().describe('Customer defined alpha-numeric account code.'),
        name: z.string().optional().describe('Name of the account.'),
        status: z.string().optional().describe('Current status of the account. Example: "ACTIVE".'),
        type: z.string().optional().describe('The type of the account. Example: "BANK".'),
        taxType: z.string().optional().describe('The tax type from TaxRates.'),
        class: z.string().optional().describe('The class of the account. Example: "ASSET".'),
        enablePaymentsToAccount: z.boolean().optional().describe('Boolean to indicate if the account can have payments applied to it.'),
        showInExpenseClaims: z.boolean().optional().describe('Boolean to indicate if the account is shown in expense claims.'),
        bankAccountType: z.string().optional().describe('Bank account type if this is a bank account.'),
        reportingCode: z.string().optional().describe('Shorthand that identifies the account.'),
        reportingCodeName: z.string().optional().describe('Full name of the reporting code.'),
        hasAttachments: z.boolean().optional().describe('Boolean to indicate if the account has attachments.'),
        updatedDateUtc: z.string().optional().describe('Timestamp of the last update to the account.'),
        addToWatchlist: z.boolean().optional().describe('Boolean to indicate if the account is shown in the watchlist widget.')
    })
    .describe('A Xero account retrieved by AccountID.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single account by ID from the Xero Accounting API.
 * @pitfalls: updatedDateUtc is returned in Xero's /Date(timestamp+offset)/ format rather than ISO 8601.
 */
const action = createAction({
    description: 'Retrieve an account by AccountID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;

        let tenantId: string | undefined;

        if (
            connectionConfig &&
            typeof connectionConfig === 'object' &&
            'tenant_id' in connectionConfig &&
            typeof connectionConfig['tenant_id'] === 'string' &&
            connectionConfig['tenant_id'].length > 0
        ) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (
                metadata &&
                typeof metadata === 'object' &&
                'tenantId' in metadata &&
                typeof metadata['tenantId'] === 'string' &&
                metadata['tenantId'].length > 0
            ) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsBody = connectionsResponse.data;
            if (!Array.isArray(connectionsBody) || connectionsBody.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsBody.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsBody[0];
            if (
                firstConnection &&
                typeof firstConnection === 'object' &&
                'tenantId' in firstConnection &&
                typeof firstConnection['tenantId'] === 'string' &&
                firstConnection['tenantId'].length > 0
            ) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/accounts
        const response = await nango.get({
            endpoint: `api.xro/2.0/Accounts/${encodeURIComponent(input.accountId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData['Accounts']) || rawData['Accounts'].length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Account not found for ID: ${input.accountId}`
            });
        }

        const providerAccount = ProviderAccountSchema.parse(rawData['Accounts'][0]);

        return {
            accountId: providerAccount.AccountID,
            ...(providerAccount.Code !== undefined && { code: providerAccount.Code }),
            ...(providerAccount.Name !== undefined && { name: providerAccount.Name }),
            ...(providerAccount.Status !== undefined && { status: providerAccount.Status }),
            ...(providerAccount.Type !== undefined && { type: providerAccount.Type }),
            ...(providerAccount.TaxType !== undefined && { taxType: providerAccount.TaxType }),
            ...(providerAccount.Class !== undefined && { class: providerAccount.Class }),
            ...(providerAccount.EnablePaymentsToAccount !== undefined && { enablePaymentsToAccount: providerAccount.EnablePaymentsToAccount }),
            ...(providerAccount.ShowInExpenseClaims !== undefined && { showInExpenseClaims: providerAccount.ShowInExpenseClaims }),
            ...(providerAccount.BankAccountType !== undefined && { bankAccountType: providerAccount.BankAccountType }),
            ...(providerAccount.ReportingCode !== undefined && { reportingCode: providerAccount.ReportingCode }),
            ...(providerAccount.ReportingCodeName !== undefined && { reportingCodeName: providerAccount.ReportingCodeName }),
            ...(providerAccount.HasAttachments !== undefined && { hasAttachments: providerAccount.HasAttachments }),
            ...(providerAccount.UpdatedDateUTC !== undefined && { updatedDateUtc: providerAccount.UpdatedDateUTC }),
            ...(providerAccount.AddToWatchlist !== undefined && { addToWatchlist: providerAccount.AddToWatchlist })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
