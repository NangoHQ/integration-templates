import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    account_id: z.string().describe('ID of the chart of account entry. Example: "260815000000000388"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional(),
    value: z.string().optional()
});

const ProviderChartOfAccountSchema = z.object({
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    is_active: z.boolean().optional(),
    account_type: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    include_in_vat_return: z.boolean().optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    parent_account_id: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    is_user_created: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    current_balance: z.union([z.string(), z.number(), z.null()]).optional(),
    parent_account_name: z.string().optional(),
    depth: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.string().optional(),
    child_count: z.string().optional()
});

const OutputSchema = z.object({
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    is_active: z.boolean().optional(),
    account_type: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    description: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    include_in_vat_return: z.boolean().optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    parent_account_id: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    is_user_created: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    current_balance: z.union([z.string(), z.number()]).optional(),
    parent_account_name: z.string().optional(),
    depth: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.string().optional(),
    child_count: z.string().optional()
});

function normalizeChartOfAccount(provider: z.infer<typeof ProviderChartOfAccountSchema>): z.infer<typeof OutputSchema> {
    const normalized: z.infer<typeof OutputSchema> = {};

    if (provider.account_id !== undefined) {
        normalized.account_id = provider.account_id;
    }
    if (provider.account_name !== undefined) {
        normalized.account_name = provider.account_name;
    }
    if (provider.account_code !== undefined) {
        normalized.account_code = provider.account_code;
    }
    if (provider.is_active !== undefined) {
        normalized.is_active = provider.is_active;
    }
    if (provider.account_type !== undefined) {
        normalized.account_type = provider.account_type;
    }
    if (provider.currency_id !== undefined) {
        normalized.currency_id = provider.currency_id;
    }
    if (provider.currency_code !== undefined) {
        normalized.currency_code = provider.currency_code;
    }
    if (provider.description !== undefined) {
        normalized.description = provider.description;
    }
    if (provider.is_system_account !== undefined) {
        normalized.is_system_account = provider.is_system_account;
    }
    if (provider.is_involved_in_transaction !== undefined) {
        normalized.is_involved_in_transaction = provider.is_involved_in_transaction;
    }
    if (provider.can_show_in_ze !== undefined) {
        normalized.can_show_in_ze = provider.can_show_in_ze;
    }
    if (provider.include_in_vat_return !== undefined) {
        normalized.include_in_vat_return = provider.include_in_vat_return;
    }
    if (provider.custom_fields !== undefined) {
        normalized.custom_fields = provider.custom_fields;
    }
    if (provider.parent_account_id !== undefined) {
        normalized.parent_account_id = provider.parent_account_id;
    }
    if (provider.documents !== undefined) {
        normalized.documents = provider.documents;
    }
    if (provider.created_time !== undefined) {
        normalized.created_time = provider.created_time;
    }
    if (provider.last_modified_time !== undefined) {
        normalized.last_modified_time = provider.last_modified_time;
    }
    if (provider.is_user_created !== undefined) {
        normalized.is_user_created = provider.is_user_created;
    }
    if (provider.is_standalone_account !== undefined) {
        normalized.is_standalone_account = provider.is_standalone_account;
    }
    if (provider.current_balance !== undefined && provider.current_balance !== null) {
        normalized.current_balance = provider.current_balance;
    }
    if (provider.parent_account_name !== undefined) {
        normalized.parent_account_name = provider.parent_account_name;
    }
    if (provider.depth !== undefined) {
        normalized.depth = provider.depth;
    }
    if (provider.has_attachment !== undefined) {
        normalized.has_attachment = provider.has_attachment;
    }
    if (provider.is_child_present !== undefined) {
        normalized.is_child_present = provider.is_child_present;
    }
    if (provider.child_count !== undefined) {
        normalized.child_count = provider.child_count;
    }

    return normalized;
}

const action = createAction({
    description: 'Retrieve a single chart of account entry from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-chart-of-account',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/chart-of-accounts/#get-an-account
            endpoint: `/books/v3/chartofaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const ApiResponseSchema = z.object({
            code: z.number(),
            message: z.string().optional(),
            chart_of_account: ProviderChartOfAccountSchema.optional()
        });

        const parsed = ApiResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho Books API'
            });
        }

        if (parsed.data.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.data.message ?? 'Failed to retrieve chart of account',
                code: parsed.data.code
            });
        }

        if (!parsed.data.chart_of_account) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Chart of account entry not found',
                account_id: input.account_id
            });
        }

        return normalizeChartOfAccount(parsed.data.chart_of_account);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
