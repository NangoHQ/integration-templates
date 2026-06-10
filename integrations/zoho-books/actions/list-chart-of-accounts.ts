import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    per_page: z.number().optional().describe('Number of records per page.'),
    filter_by: z
        .string()
        .optional()
        .describe(
            'Filter by account type and status. Allowed Values: AccountType.All, AccountType.Active, AccountType.Inactive, AccountType.Asset, AccountType.Liability, AccountType.Equity, AccountType.Income, AccountType.Expense.'
        ),
    sort_column: z.string().optional().describe('Sort accounts. Allowed Values: account_name, account_type, account_code.'),
    search_text: z.string().optional().describe('Search accounts by account name or code.'),
    account_name: z.string().optional().describe('Search by account name.'),
    account_code: z.string().optional().describe('Search by account code.'),
    account_id: z.string().optional().describe('Search by account ID.'),
    showbalance: z.boolean().optional().describe('Boolean to get current balance of accounts.')
});

const ProviderAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    account_type: z.string().optional(),
    is_user_created: z.boolean().optional(),
    is_system_account: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    is_active: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    current_balance: z.number().nullable().optional(),
    parent_account_id: z.string().optional(),
    parent_account_name: z.string().optional(),
    depth: z.number().optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.boolean().optional(),
    child_count: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    chartofaccounts: z.array(z.unknown()).optional(),
    page_context: z
        .object({
            page: z.number().optional(),
            per_page: z.number().optional(),
            has_more_page: z.boolean().optional()
        })
        .optional()
});

const OutputAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    account_type: z.string().optional(),
    is_user_created: z.boolean().optional(),
    is_system_account: z.boolean().optional(),
    is_standalone_account: z.boolean().optional(),
    is_active: z.boolean().optional(),
    can_show_in_ze: z.boolean().optional(),
    is_involved_in_transaction: z.boolean().optional(),
    current_balance: z.number().optional(),
    parent_account_id: z.string().optional(),
    parent_account_name: z.string().optional(),
    depth: z.number().optional(),
    has_attachment: z.boolean().optional(),
    is_child_present: z.boolean().optional(),
    child_count: z.string().optional(),
    documents: z.array(z.string()).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const OutputSchema = z.object({
    accounts: z.array(OutputAccountSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List chart of accounts from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-chart-of-accounts',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: organizationId,
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.account_name !== undefined) {
            params['account_name'] = input.account_name;
        }
        if (input.account_code !== undefined) {
            params['account_code'] = input.account_code;
        }
        if (input.account_id !== undefined) {
            params['account_id'] = input.account_id;
        }
        if (input.showbalance !== undefined) {
            params['showbalance'] = input.showbalance ? 'true' : 'false';
        }

        // https://www.zoho.com/books/api/v3/chart-of-accounts/#list-chart-of-accounts
        const response = await nango.get({
            endpoint: '/books/v3/chartofaccounts',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawAccounts = providerResponse.chartofaccounts || [];

        const accounts = rawAccounts.map((item) => {
            const parsed = ProviderAccountSchema.parse(item);
            return {
                account_id: parsed.account_id,
                ...(parsed.account_name !== undefined && { account_name: parsed.account_name }),
                ...(parsed.account_code !== undefined && { account_code: parsed.account_code }),
                ...(parsed.account_type !== undefined && { account_type: parsed.account_type }),
                ...(parsed.is_user_created !== undefined && { is_user_created: parsed.is_user_created }),
                ...(parsed.is_system_account !== undefined && { is_system_account: parsed.is_system_account }),
                ...(parsed.is_standalone_account !== undefined && { is_standalone_account: parsed.is_standalone_account }),
                ...(parsed.is_active !== undefined && { is_active: parsed.is_active }),
                ...(parsed.can_show_in_ze !== undefined && { can_show_in_ze: parsed.can_show_in_ze }),
                ...(parsed.is_involved_in_transaction !== undefined && { is_involved_in_transaction: parsed.is_involved_in_transaction }),
                ...(parsed.current_balance !== undefined && parsed.current_balance !== null && { current_balance: parsed.current_balance }),
                ...(parsed.parent_account_id !== undefined && { parent_account_id: parsed.parent_account_id }),
                ...(parsed.parent_account_name !== undefined && { parent_account_name: parsed.parent_account_name }),
                ...(parsed.depth !== undefined && { depth: parsed.depth }),
                ...(parsed.has_attachment !== undefined && { has_attachment: parsed.has_attachment }),
                ...(parsed.is_child_present !== undefined && { is_child_present: parsed.is_child_present }),
                ...(parsed.child_count !== undefined && { child_count: parsed.child_count }),
                ...(parsed.documents !== undefined && { documents: parsed.documents }),
                ...(parsed.created_time !== undefined && { created_time: parsed.created_time }),
                ...(parsed.last_modified_time !== undefined && { last_modified_time: parsed.last_modified_time })
            };
        });

        const hasMorePage = providerResponse.page_context?.has_more_page ?? false;
        const nextCursor = hasMorePage ? String(page + 1) : undefined;

        return {
            accounts: accounts,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
