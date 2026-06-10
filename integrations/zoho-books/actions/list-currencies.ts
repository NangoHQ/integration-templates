import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records to fetch per page. Default is 200.'),
    filter_by: z.string().optional().describe('Filter currencies. Allowed value: Currencies.ExcludeBaseCurrency')
});

const CurrencySchema = z.object({
    currency_id: z.string(),
    currency_code: z.string(),
    currency_name: z.string(),
    currency_symbol: z.string().optional(),
    price_precision: z.number().optional(),
    currency_format: z.string().optional(),
    is_base_currency: z.boolean().optional(),
    exchange_rate: z.number().optional(),
    effective_date: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CurrencySchema),
    next_page: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    currencies: z.array(z.unknown()).optional(),
    page_context: z
        .object({
            page: z.number().optional(),
            per_page: z.number().optional(),
            has_more_page: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List configured currencies from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-currencies',
        group: 'Currencies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.settings.READ'],

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

        const params: Record<string, string | number> = {
            organization_id: organizationId
        };

        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/currency/#list-currencies
            endpoint: '/books/v3/settings/currencies',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho Books API'
            });
        }

        const body = providerResponse.data;

        if (body.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: body.message
            });
        }

        const currencies = (body.currencies || []).map((item) => {
            const parsed = CurrencySchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected currency format in Zoho Books API response'
                });
            }
            return parsed.data;
        });

        const nextPage = body.page_context?.has_more_page ? String((body.page_context.page || 1) + 1) : undefined;

        return {
            items: currencies,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
