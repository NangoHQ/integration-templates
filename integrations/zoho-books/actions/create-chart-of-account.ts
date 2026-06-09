import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const InputSchema = z.object({
    account_name: z.string().describe('Name of the account. Example: "Notes Payable"'),
    account_type: z.string().describe('Type of the account. Example: "long_term_liability", "income", "expense"'),
    account_code: z.string().optional().describe('Code associated with the account'),
    currency_id: z.string().optional().describe('ID of the account currency'),
    description: z.string().optional().describe('Description of the account'),
    parent_account_id: z.string().optional().describe('ID of the parent account'),
    show_on_dashboard: z.boolean().optional().describe('Whether to show the account balance on the dashboard'),
    can_show_in_ze: z.boolean().optional().describe('Whether the account can be shown in Zoho Expense'),
    include_in_vat_return: z.boolean().optional().describe('United Kingdom only. Boolean to include an account in VAT returns')
});

const ProviderCustomFieldSchema = z.object({
    customfield_id: z.string().optional(),
    value: z.string().optional()
});

const ProviderChartOfAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    is_active: z.boolean().optional(),
    account_type: z.string(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    include_in_vat_return: z.boolean().optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional(),
    parent_account_id: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    chart_of_account: ProviderChartOfAccountSchema.optional()
});

const OutputSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    account_type: z.string(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    is_system_account: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    include_in_vat_return: z.boolean().optional(),
    parent_account_id: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const action = createAction({
    description: 'Create a chart of account entry in Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-chart-of-account',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.accountants.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organizationId = parsedMetadata.data.organization_id;

        const config: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/chart-of-accounts/#create-an-account
            endpoint: '/books/v3/chartofaccounts',
            params: {
                organization_id: organizationId
            },
            data: {
                account_name: input.account_name,
                account_type: input.account_type,
                ...(input.account_code !== undefined && { account_code: input.account_code }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.parent_account_id !== undefined && { parent_account_id: input.parent_account_id }),
                ...(input.show_on_dashboard !== undefined && { show_on_dashboard: input.show_on_dashboard }),
                ...(input.can_show_in_ze !== undefined && { can_show_in_ze: input.can_show_in_ze }),
                ...(input.include_in_vat_return !== undefined && { include_in_vat_return: input.include_in_vat_return })
            },
            retries: 10
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Failed to create chart of account',
                code: providerResponse.code
            });
        }

        const chartOfAccount = providerResponse.chart_of_account;

        if (!chartOfAccount) {
            throw new nango.ActionError({
                type: 'missing_response',
                message: 'Provider response did not include chart_of_account data'
            });
        }

        return {
            account_id: chartOfAccount.account_id,
            account_name: chartOfAccount.account_name,
            ...(chartOfAccount.account_code !== undefined && { account_code: chartOfAccount.account_code }),
            account_type: chartOfAccount.account_type,
            ...(chartOfAccount.currency_id !== undefined && { currency_id: chartOfAccount.currency_id }),
            ...(chartOfAccount.currency_code !== undefined && { currency_code: chartOfAccount.currency_code }),
            ...(chartOfAccount.description !== undefined && { description: chartOfAccount.description }),
            ...(chartOfAccount.is_active !== undefined && { is_active: chartOfAccount.is_active }),
            ...(chartOfAccount.is_system_account !== undefined && { is_system_account: chartOfAccount.is_system_account }),
            ...(chartOfAccount.can_show_in_ze !== undefined && { can_show_in_ze: chartOfAccount.can_show_in_ze }),
            ...(chartOfAccount.include_in_vat_return !== undefined && { include_in_vat_return: chartOfAccount.include_in_vat_return }),
            ...(chartOfAccount.parent_account_id !== undefined && { parent_account_id: chartOfAccount.parent_account_id }),
            ...(chartOfAccount.created_time !== undefined && { created_time: chartOfAccount.created_time }),
            ...(chartOfAccount.last_modified_time !== undefined && { last_modified_time: chartOfAccount.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
