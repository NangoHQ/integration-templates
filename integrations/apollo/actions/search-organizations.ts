import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    q_organization_domains_list: z
        .array(z.string())
        .optional()
        .describe('Domain names for the organization (e.g., "apollo.io", "microsoft.com"). Up to 1,000 domains.'),
    organization_num_employees_ranges: z.array(z.string()).optional().describe('Employee count ranges (e.g., "1,10", "250,500").'),
    organization_locations: z.array(z.string()).optional().describe('HQ locations to include (e.g., "texas", "tokyo", "spain").'),
    organization_not_locations: z.array(z.string()).optional().describe('HQ locations to exclude.'),
    q_organization_keyword_tags: z.array(z.string()).optional().describe('Keyword tags to filter by (e.g., "mining", "consulting").'),
    q_organization_name: z.string().optional().describe('Organization name to search for. Partial matches accepted.'),
    organization_ids: z.array(z.string()).optional().describe('Specific Apollo organization IDs to include.'),
    currently_using_any_of_technology_uids: z
        .array(z.string())
        .optional()
        .describe('Technologies the organization uses (e.g., "salesforce", "google_analytics").'),
    revenue_range_min: z.number().optional().describe('Minimum revenue filter (no currency symbols, commas, or decimals).'),
    revenue_range_max: z.number().optional().describe('Maximum revenue filter.'),
    latest_funding_amount_range_min: z.number().optional().describe('Minimum latest funding amount.'),
    latest_funding_amount_range_max: z.number().optional().describe('Maximum latest funding amount.'),
    total_funding_range_min: z.number().optional().describe('Minimum total funding amount.'),
    total_funding_range_max: z.number().optional().describe('Maximum total funding amount.'),
    latest_funding_date_range_min: z.string().optional().describe('Minimum latest funding date (YYYY-MM-DD).'),
    latest_funding_date_range_max: z.string().optional().describe('Maximum latest funding date (YYYY-MM-DD).'),
    q_organization_job_titles: z.array(z.string()).optional().describe('Job titles in active job postings.'),
    organization_job_locations: z.array(z.string()).optional().describe('Locations of jobs being recruited.'),
    organization_num_jobs_range_min: z.number().optional().describe('Minimum number of active job postings.'),
    organization_num_jobs_range_max: z.number().optional().describe('Maximum number of active job postings.'),
    organization_job_posted_at_range_min: z.string().optional().describe('Earliest job posted date (YYYY-MM-DD).'),
    organization_job_posted_at_range_max: z.string().optional().describe('Latest job posted date (YYYY-MM-DD).'),
    page: z.number().int().min(1).optional().describe('Page number for pagination. Default: 1.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Results per page (max 100). Default: 25.')
});

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total_entries: z.number(),
    total_pages: z.number()
});

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    website_url: z.string().optional(),
    organization_city: z.string().optional(),
    organization_state: z.string().optional(),
    organization_country: z.string().optional(),
    organization_location: z.string().optional(),
    organization_num_employees: z.number().optional(),
    organization_description: z.string().optional(),
    organization_phone: z.string().optional(),
    organization_industry: z.string().optional(),
    organization_founded_year: z.number().optional(),
    organization_revenue: z.number().optional(),
    organization_revenue_range: z.string().optional(),
    organization_total_funding: z.number().optional(),
    organization_latest_funding_amount: z.number().optional(),
    organization_latest_funding_date: z.string().optional(),
    organization_funding_currency: z.string().optional(),
    organization_currency: z.string().optional(),
    organization_alexa_ranking: z.number().optional(),
    organization_publicly_traded: z.boolean().optional(),
    ticker_symbol: z.string().optional(),
    linkedin_url: z.string().optional(),
    facebook_url: z.string().optional(),
    twitter_url: z.string().optional(),
    organization_technologies: z.array(z.string()).optional(),
    organization_num_jobs: z.number().optional(),
    account_id: z.string().optional()
});

const ProviderResponseSchema = z.object({
    organizations: z.array(OrganizationSchema),
    pagination: PaginationSchema.optional()
});

const OutputSchema = z.object({
    organizations: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            domain: z.string().optional(),
            website_url: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            location: z.string().optional(),
            num_employees: z.number().optional(),
            description: z.string().optional(),
            phone: z.string().optional(),
            industry: z.string().optional(),
            founded_year: z.number().optional(),
            revenue: z.number().optional(),
            revenue_range: z.string().optional(),
            total_funding: z.number().optional(),
            latest_funding_amount: z.number().optional(),
            latest_funding_date: z.string().optional(),
            funding_currency: z.string().optional(),
            currency: z.string().optional(),
            alexa_ranking: z.number().optional(),
            publicly_traded: z.boolean().optional(),
            ticker: z.string().optional(),
            linkedin_url: z.string().optional(),
            facebook_url: z.string().optional(),
            twitter_url: z.string().optional(),
            technologies: z.array(z.string()).optional(),
            num_jobs: z.number().optional(),
            account_id: z.string().optional()
        })
    ),
    pagination: z
        .object({
            page: z.number(),
            per_page: z.number(),
            total_entries: z.number(),
            total_pages: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Search Apollo organization records.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-organizations',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.q_organization_domains_list !== undefined) {
            requestBody['q_organization_domains_list'] = input.q_organization_domains_list;
        }
        if (input.organization_num_employees_ranges !== undefined) {
            requestBody['organization_num_employees_ranges'] = input.organization_num_employees_ranges;
        }
        if (input.organization_locations !== undefined) {
            requestBody['organization_locations'] = input.organization_locations;
        }
        if (input.organization_not_locations !== undefined) {
            requestBody['organization_not_locations'] = input.organization_not_locations;
        }
        if (input.q_organization_keyword_tags !== undefined) {
            requestBody['q_organization_keyword_tags'] = input.q_organization_keyword_tags;
        }
        if (input.q_organization_name !== undefined) {
            requestBody['q_organization_name'] = input.q_organization_name;
        }
        if (input.organization_ids !== undefined) {
            requestBody['organization_ids'] = input.organization_ids;
        }
        if (input.currently_using_any_of_technology_uids !== undefined) {
            requestBody['currently_using_any_of_technology_uids'] = input.currently_using_any_of_technology_uids;
        }
        if (input.revenue_range_min !== undefined) {
            requestBody['revenue_range[min]'] = input.revenue_range_min;
        }
        if (input.revenue_range_max !== undefined) {
            requestBody['revenue_range[max]'] = input.revenue_range_max;
        }
        if (input.latest_funding_amount_range_min !== undefined) {
            requestBody['latest_funding_amount_range[min]'] = input.latest_funding_amount_range_min;
        }
        if (input.latest_funding_amount_range_max !== undefined) {
            requestBody['latest_funding_amount_range[max]'] = input.latest_funding_amount_range_max;
        }
        if (input.total_funding_range_min !== undefined) {
            requestBody['total_funding_range[min]'] = input.total_funding_range_min;
        }
        if (input.total_funding_range_max !== undefined) {
            requestBody['total_funding_range[max]'] = input.total_funding_range_max;
        }
        if (input.latest_funding_date_range_min !== undefined) {
            requestBody['latest_funding_date_range[min]'] = input.latest_funding_date_range_min;
        }
        if (input.latest_funding_date_range_max !== undefined) {
            requestBody['latest_funding_date_range[max]'] = input.latest_funding_date_range_max;
        }
        if (input.q_organization_job_titles !== undefined) {
            requestBody['q_organization_job_titles'] = input.q_organization_job_titles;
        }
        if (input.organization_job_locations !== undefined) {
            requestBody['organization_job_locations'] = input.organization_job_locations;
        }
        if (input.organization_num_jobs_range_min !== undefined) {
            requestBody['organization_num_jobs_range[min]'] = input.organization_num_jobs_range_min;
        }
        if (input.organization_num_jobs_range_max !== undefined) {
            requestBody['organization_num_jobs_range[max]'] = input.organization_num_jobs_range_max;
        }
        if (input.organization_job_posted_at_range_min !== undefined) {
            requestBody['organization_job_posted_at_range[min]'] = input.organization_job_posted_at_range_min;
        }
        if (input.organization_job_posted_at_range_max !== undefined) {
            requestBody['organization_job_posted_at_range[max]'] = input.organization_job_posted_at_range_max;
        }
        if (input.page !== undefined) {
            requestBody['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            requestBody['per_page'] = input.per_page;
        }

        // https://docs.apollo.io/reference/organization-search
        const response = await nango.post({
            endpoint: '/v1/mixed_companies/search',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            organizations: parsed.organizations.map((org) => ({
                id: org.id,
                ...(org.name !== undefined && { name: org.name }),
                ...(org.domain !== undefined && { domain: org.domain }),
                ...(org.website_url !== undefined && { website_url: org.website_url }),
                ...(org.organization_city !== undefined && { city: org.organization_city }),
                ...(org.organization_state !== undefined && { state: org.organization_state }),
                ...(org.organization_country !== undefined && { country: org.organization_country }),
                ...(org.organization_location !== undefined && { location: org.organization_location }),
                ...(org.organization_num_employees !== undefined && { num_employees: org.organization_num_employees }),
                ...(org.organization_description !== undefined && { description: org.organization_description }),
                ...(org.organization_phone !== undefined && { phone: org.organization_phone }),
                ...(org.organization_industry !== undefined && { industry: org.organization_industry }),
                ...(org.organization_founded_year !== undefined && { founded_year: org.organization_founded_year }),
                ...(org.organization_revenue !== undefined && { revenue: org.organization_revenue }),
                ...(org.organization_revenue_range !== undefined && { revenue_range: org.organization_revenue_range }),
                ...(org.organization_total_funding !== undefined && { total_funding: org.organization_total_funding }),
                ...(org.organization_latest_funding_amount !== undefined && { latest_funding_amount: org.organization_latest_funding_amount }),
                ...(org.organization_latest_funding_date !== undefined && { latest_funding_date: org.organization_latest_funding_date }),
                ...(org.organization_funding_currency !== undefined && { funding_currency: org.organization_funding_currency }),
                ...(org.organization_currency !== undefined && { currency: org.organization_currency }),
                ...(org.organization_alexa_ranking !== undefined && { alexa_ranking: org.organization_alexa_ranking }),
                ...(org.organization_publicly_traded !== undefined && { publicly_traded: org.organization_publicly_traded }),
                ...(org.ticker_symbol !== undefined && { ticker: org.ticker_symbol }),
                ...(org.linkedin_url !== undefined && { linkedin_url: org.linkedin_url }),
                ...(org.facebook_url !== undefined && { facebook_url: org.facebook_url }),
                ...(org.twitter_url !== undefined && { twitter_url: org.twitter_url }),
                ...(org.organization_technologies !== undefined && { technologies: org.organization_technologies }),
                ...(org.organization_num_jobs !== undefined && { num_jobs: org.organization_num_jobs }),
                ...(org.account_id !== undefined && { account_id: org.account_id })
            })),
            ...(parsed.pagination !== undefined && {
                pagination: {
                    page: parsed.pagination.page,
                    per_page: parsed.pagination.per_page,
                    total_entries: parsed.pagination.total_entries,
                    total_pages: parsed.pagination.total_pages
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
