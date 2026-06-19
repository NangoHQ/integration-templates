import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor from the previous response. Pass the value of `next_cursor` from the previous response to fetch the next page. Omit for the first page.'
            ),
        q_organization_name: z
            .string()
            .optional()
            .describe('Keywords to narrow the search of accounts. Keywords should directly match at least part of an account name. Example: "apollo"'),
        account_stage_ids: z
            .array(z.string())
            .optional()
            .describe('Apollo IDs for account stages to include in search results. Call List Account Stages endpoint to retrieve available IDs.'),
        account_label_ids: z.array(z.string()).optional().describe('Apollo IDs for labels to include in search results.'),
        sort_by_field: z
            .enum(['account_last_activity_date', 'account_created_at', 'account_updated_at'])
            .optional()
            .describe('Sort matching accounts by the specified field.'),
        sort_ascending: z
            .boolean()
            .optional()
            .describe('Set to true to sort in ascending order. Must be used with sort_by_field. Defaults to false (descending).'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100. Defaults to 100.')
    })
    .refine((data) => !data.sort_ascending || data.sort_by_field !== undefined, {
        message: 'sort_by_field is required when sort_ascending is set',
        path: ['sort_ascending']
    });

const PaginationSchema = z.object({
    page: z.number().describe('Current page number.'),
    per_page: z.number().describe('Number of results per page.'),
    total_entries: z.number().describe('Total number of accounts matching the query.'),
    total_pages: z.number().describe('Total number of pages available.')
});

const AccountSchema = z.object({
    id: z.string().describe('Apollo ID for the account.'),
    name: z.string().describe('Name of the account/company.'),
    domain: z.string().optional().describe('Primary domain of the account.'),
    organization_id: z.string().optional().describe('Apollo organization ID.'),
    account_stage_id: z.string().optional().describe('ID of the account stage.'),
    owner_id: z.string().optional().describe('ID of the user who owns this account.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the account was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the account was last updated.'),
    last_activity_at: z.string().optional().describe('ISO 8601 timestamp of the most recent activity.'),
    phone: z.string().optional().describe('Phone number associated with the account.'),
    address: z.string().optional().describe('Physical address of the account.'),
    city: z.string().optional().describe('City of the account.'),
    state: z.string().optional().describe('State of the account.'),
    country: z.string().optional().describe('Country of the account.'),
    postal_code: z.string().optional().describe('Postal code of the account.'),
    industry: z.string().optional().describe('Industry of the account.'),
    employees: z.number().optional().describe('Number of employees at the account.'),
    annual_revenue: z.number().optional().describe('Annual revenue of the account.'),
    description: z.string().optional().describe('Description of the account.'),
    website: z.string().optional().describe('Website URL of the account.'),
    linkedin_url: z.string().optional().describe('LinkedIn URL of the account.'),
    twitter_url: z.string().optional().describe('Twitter URL of the account.'),
    facebook_url: z.string().optional().describe('Facebook URL of the account.'),
    labels: z
        .array(z.object({ id: z.string(), name: z.string() }))
        .optional()
        .describe('Labels attached to the account.')
});

const OutputSchema = z.object({
    accounts: z.array(AccountSchema).describe('List of accounts matching the search criteria.'),
    pagination: PaginationSchema.describe('Pagination information for the results.'),
    next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Null if there are no more pages.')
});

const action = createAction({
    description: 'List accounts from Apollo.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (input.cursor && (!/^\d+$/.test(input.cursor) || isNaN(page) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor format. Cursor must be a positive integer page number.'
            });
        }

        // https://docs.apollo.io/reference/search-for-accounts
        const response = await nango.post({
            endpoint: '/v1/accounts/search',
            data: {
                ...(input.q_organization_name !== undefined && { q_organization_name: input.q_organization_name }),
                ...(input.account_stage_ids !== undefined && { account_stage_ids: input.account_stage_ids }),
                ...(input.account_label_ids !== undefined && { account_label_ids: input.account_label_ids }),
                ...(input.sort_by_field !== undefined && { sort_by_field: input.sort_by_field }),
                ...(input.sort_ascending !== undefined && { sort_ascending: input.sort_ascending }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                page: page
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API'
            });
        }

        const accounts = Array.isArray(data.accounts) ? data.accounts : [];
        const pagination = data.pagination || {};

        const parsedPagination = PaginationSchema.safeParse(pagination);
        if (!parsedPagination.success) {
            await nango.log('Warning: Pagination schema validation failed', { error: parsedPagination.error });
        }

        const validatedPagination = parsedPagination.success ? parsedPagination.data : null;
        const currentPage = validatedPagination?.page ?? pagination.page ?? page;
        const totalPages = validatedPagination?.total_pages ?? pagination.total_pages ?? currentPage;
        const nextCursor = currentPage < totalPages ? String(currentPage + 1) : undefined;

        return {
            accounts: accounts.map((account: Record<string, unknown>) => ({
                id: String(account['id'] || ''),
                name: String(account['name'] || ''),
                ...(account['domain'] !== undefined && account['domain'] !== null && { domain: String(account['domain']) }),
                ...(account['organization_id'] !== undefined && account['organization_id'] !== null && { organization_id: String(account['organization_id']) }),
                ...(account['account_stage_id'] !== undefined &&
                    account['account_stage_id'] !== null && { account_stage_id: String(account['account_stage_id']) }),
                ...(account['owner_id'] !== undefined && account['owner_id'] !== null && { owner_id: String(account['owner_id']) }),
                ...(account['created_at'] !== undefined && account['created_at'] !== null && { created_at: String(account['created_at']) }),
                ...(account['updated_at'] !== undefined && account['updated_at'] !== null && { updated_at: String(account['updated_at']) }),
                ...(account['last_activity_at'] !== undefined &&
                    account['last_activity_at'] !== null && { last_activity_at: String(account['last_activity_at']) }),
                ...(account['phone'] !== undefined && account['phone'] !== null && { phone: String(account['phone']) }),
                ...(account['address'] !== undefined && account['address'] !== null && { address: String(account['address']) }),
                ...(account['city'] !== undefined && account['city'] !== null && { city: String(account['city']) }),
                ...(account['state'] !== undefined && account['state'] !== null && { state: String(account['state']) }),
                ...(account['country'] !== undefined && account['country'] !== null && { country: String(account['country']) }),
                ...(account['postal_code'] !== undefined && account['postal_code'] !== null && { postal_code: String(account['postal_code']) }),
                ...(account['industry'] !== undefined && account['industry'] !== null && { industry: String(account['industry']) }),
                ...(account['employees'] !== undefined && account['employees'] !== null && { employees: Number(account['employees']) }),
                ...(account['annual_revenue'] !== undefined && account['annual_revenue'] !== null && { annual_revenue: Number(account['annual_revenue']) }),
                ...(account['description'] !== undefined && account['description'] !== null && { description: String(account['description']) }),
                ...(account['website'] !== undefined && account['website'] !== null && { website: String(account['website']) }),
                ...(account['linkedin_url'] !== undefined && account['linkedin_url'] !== null && { linkedin_url: String(account['linkedin_url']) }),
                ...(account['twitter_url'] !== undefined && account['twitter_url'] !== null && { twitter_url: String(account['twitter_url']) }),
                ...(account['facebook_url'] !== undefined && account['facebook_url'] !== null && { facebook_url: String(account['facebook_url']) }),
                ...(account['labels'] !== undefined &&
                    account['labels'] !== null && {
                        labels: Array.isArray(account['labels'])
                            ? account['labels'].map((label: Record<string, unknown>) => ({
                                  id: String(label['id'] || ''),
                                  name: String(label['name'] || '')
                              }))
                            : []
                    })
            })),
            pagination: {
                page: validatedPagination?.page ?? currentPage,
                per_page: validatedPagination?.per_page ?? input.per_page ?? 100,
                total_entries: validatedPagination?.total_entries ?? accounts.length,
                total_pages: totalPages
            },
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
