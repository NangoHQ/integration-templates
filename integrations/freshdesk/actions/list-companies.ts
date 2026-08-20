import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().min(1).max(100).optional().describe('Number of companies to return per page. Maximum is 100. Defaults to 30.'),
        updated_since: z.string().optional().describe('Filter companies updated after this timestamp. Example: "2024-02-28T00:00:00Z".')
    })
    .describe('Input for listing Freshdesk companies with optional pagination and filtering.');

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    domains: z.array(z.string()),
    note: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).nullable(),
    health_score: z.string().nullable(),
    account_tier: z.string().nullable(),
    renewal_date: z.string().nullable(),
    industry: z.string().nullable()
});

const CompanySchema = z.object({
    id: z.number().describe('Unique company ID.'),
    name: z.string().optional().describe('Company name.'),
    description: z.string().optional().describe('Company description.'),
    domains: z.array(z.string()).describe('List of company domains.'),
    note: z.string().optional().describe('Additional notes about the company.'),
    created_at: z.string().optional().describe('Timestamp when the company was created.'),
    updated_at: z.string().optional().describe('Timestamp when the company was last updated.'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values configured for the company.'),
    health_score: z.string().optional().describe('Health score of the company.'),
    account_tier: z.string().optional().describe('Account tier of the company.'),
    renewal_date: z.string().optional().describe('Subscription renewal date.'),
    industry: z.string().optional().describe('Industry of the company.')
});

const OutputSchema = z
    .object({
        items: z.array(CompanySchema).describe('List of companies returned for the current page.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omitted if there are no more pages.')
    })
    .describe('Output containing a page of Freshdesk companies and an optional next pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads company data from Freshdesk without making any changes.
 * @pitfalls: Unset custom fields appear as `null` values inside the `custom_fields` object rather than being omitted.
 */
const action = createAction({
    description: 'List companies from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#list_all_companies
        const response = await nango.get({
            endpoint: '/api/v2/companies',
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.updated_since !== undefined && { updated_since: input.updated_since })
            },
            retries: 3
        });

        const providerCompanies = z.array(ProviderCompanySchema).parse(response.data);

        const items = providerCompanies.map((item) => ({
            id: item.id,
            ...(item.name != null && { name: item.name }),
            ...(item.description != null && { description: item.description }),
            domains: item.domains,
            ...(item.note != null && { note: item.note }),
            ...(item.created_at != null && { created_at: item.created_at }),
            ...(item.updated_at != null && { updated_at: item.updated_at }),
            ...(item.custom_fields != null && { custom_fields: item.custom_fields }),
            ...(item.health_score != null && { health_score: item.health_score }),
            ...(item.account_tier != null && { account_tier: item.account_tier }),
            ...(item.renewal_date != null && { renewal_date: item.renewal_date }),
            ...(item.industry != null && { industry: item.industry })
        }));

        const linkHeader = response.headers['link'];
        let nextCursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const nextUrlStr = nextMatch[1].trim();
                const nextUrl = new URL(nextUrlStr);
                const nextPage = nextUrl.searchParams.get('page');
                if (nextPage) {
                    nextCursor = nextPage;
                }
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
