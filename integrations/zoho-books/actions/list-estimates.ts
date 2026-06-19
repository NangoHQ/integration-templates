import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    per_page: z.number().optional().describe('Number of records per page.'),
    customer_id: z.string().optional().describe('Filter by customer ID.'),
    status: z.string().optional().describe('Filter by status: draft, sent, invoiced, accepted, declined, expired.'),
    search_text: z.string().optional().describe('Keyword search across estimate number, reference number, or customer name.'),
    estimate_number: z.string().optional().describe('Filter by estimate number.'),
    date: z.string().optional().describe('Filter by estimate date.'),
    date_start: z.string().optional().describe('Filter estimates with date on or after yyyy-mm-dd.'),
    date_end: z.string().optional().describe('Filter estimates with date on or before yyyy-mm-dd.'),
    sort_column: z.string().optional().describe('Sort by: customer_name, estimate_number, date, total, created_time.')
});

const EstimateSchema = z.object({
    estimate_id: z.string(),
    customer_name: z.string().optional(),
    customer_id: z.string().optional(),
    company_name: z.string().optional(),
    status: z.string().optional(),
    current_sub_status_id: z.string().optional(),
    current_sub_status: z.string().optional(),
    color_code: z.string().optional(),
    estimate_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    total: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    accepted_date: z.string().optional(),
    declined_date: z.string().optional(),
    expiry_date: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_viewed_by_client: z.boolean().optional(),
    client_viewed_time: z.string().optional(),
    is_emailed: z.boolean().optional(),
    template_type: z.string().optional(),
    template_id: z.string().optional(),
    salesperson_id: z.string().optional(),
    salesperson_name: z.string().optional(),
    zcrm_potential_id: z.string().optional(),
    zcrm_potential_name: z.string().optional(),
    tags: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    estimates: z.array(EstimateSchema),
    next_page: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    estimates: z.array(EstimateSchema).optional(),
    page_context: z
        .object({
            page: z.number(),
            per_page: z.number(),
            has_more_page: z.boolean(),
            report_name: z.string().optional(),
            applied_filter: z.string().optional(),
            sort_column: z.string().optional(),
            sort_order: z.string().optional(),
            custom_fields: z.array(z.unknown()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'List estimates from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.estimates.READ', 'ZohoBooks.settings.READ'],

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

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer representing a page number.'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: organizationId,
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.estimate_number !== undefined) {
            params['estimate_number'] = input.estimate_number;
        }
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.date_start !== undefined) {
            params['date_start'] = input.date_start;
        }
        if (input.date_end !== undefined) {
            params['date_end'] = input.date_end;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }

        // https://www.zoho.com/books/api/v3/estimates/#list-estimates
        const response = await nango.get({
            endpoint: '/books/v3/estimates',
            params: params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Zoho Books API response.',
                details: parsedResponse.error.message
            });
        }

        const data = parsedResponse.data;
        const estimates = data.estimates || [];
        const hasMorePage = data.page_context ? data.page_context.has_more_page : false;
        const nextPage = hasMorePage ? String(page + 1) : undefined;

        return {
            estimates: estimates,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
