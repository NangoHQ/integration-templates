import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_id: z.string().describe('ID of the account to update. Example: "260815000000000388"'),
    account_name: z.string().optional().describe('Name of the account'),
    account_code: z.string().optional().describe('Code associated with the account'),
    account_type: z.string().optional().describe('Type of the account. Example: "income"'),
    currency_id: z.string().optional().describe('ID of the account currency'),
    description: z.string().optional().describe('Description of the account'),
    show_on_dashboard: z.boolean().optional().describe('Whether to show the account balance on the dashboard'),
    can_show_in_ze: z.boolean().optional().describe('Whether the account can be shown in Zoho Expense'),
    include_in_vat_return: z.boolean().optional().describe('Boolean to include an account in VAT returns'),
    parent_account_id: z.string().optional().describe('ID of the parent account'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string(),
                value: z.string()
            })
        )
        .optional()
        .describe('List of custom fields for the account')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    chart_of_account: z
        .object({
            account_id: z.string(),
            account_name: z.string(),
            account_code: z.string().optional(),
            is_active: z.boolean(),
            account_type: z.string(),
            currency_id: z.string().optional(),
            currency_code: z.string().optional(),
            description: z.string().optional(),
            is_system_account: z.boolean().optional(),
            is_involved_in_transaction: z.boolean().optional(),
            can_show_in_ze: z.boolean().optional(),
            include_in_vat_return: z.boolean().optional(),
            parent_account_id: z.string().optional(),
            documents: z.array(z.unknown()).optional(),
            created_time: z.string(),
            last_modified_time: z.string(),
            custom_fields: z
                .array(
                    z.object({
                        customfield_id: z.string(),
                        value: z.string()
                    })
                )
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    is_active: z.boolean(),
    account_type: z.string(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    include_in_vat_return: z.boolean().optional(),
    parent_account_id: z.string().optional(),
    created_time: z.string(),
    last_modified_time: z.string(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string(),
                value: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update a chart of account entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-chart-of-account',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = '927270289';

        const response = await nango.put({
            // https://www.zoho.com/books/api/v3/chart-of-accounts/#update-an-account
            endpoint: `/books/v3/chartofaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            data: {
                ...(input.account_name !== undefined && { account_name: input.account_name }),
                ...(input.account_code !== undefined && { account_code: input.account_code }),
                ...(input.account_type !== undefined && { account_type: input.account_type }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.show_on_dashboard !== undefined && { show_on_dashboard: input.show_on_dashboard }),
                ...(input.can_show_in_ze !== undefined && { can_show_in_ze: input.can_show_in_ze }),
                ...(input.include_in_vat_return !== undefined && { include_in_vat_return: input.include_in_vat_return }),
                ...(input.parent_account_id !== undefined && { parent_account_id: input.parent_account_id }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0 || !providerResponse.chart_of_account) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: providerResponse.message || 'Failed to update chart of account'
            });
        }

        const account = providerResponse.chart_of_account;

        return {
            account_id: account.account_id,
            account_name: account.account_name,
            ...(account.account_code !== undefined && { account_code: account.account_code }),
            is_active: account.is_active,
            account_type: account.account_type,
            ...(account.currency_id !== undefined && { currency_id: account.currency_id }),
            ...(account.currency_code !== undefined && { currency_code: account.currency_code }),
            ...(account.description !== undefined && { description: account.description }),
            ...(account.is_system_account !== undefined && { is_system_account: account.is_system_account }),
            ...(account.is_involved_in_transaction !== undefined && { is_involved_in_transaction: account.is_involved_in_transaction }),
            ...(account.can_show_in_ze !== undefined && { can_show_in_ze: account.can_show_in_ze }),
            ...(account.include_in_vat_return !== undefined && { include_in_vat_return: account.include_in_vat_return }),
            ...(account.parent_account_id !== undefined && { parent_account_id: account.parent_account_id }),
            created_time: account.created_time,
            last_modified_time: account.last_modified_time,
            ...(account.custom_fields !== undefined && { custom_fields: account.custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
