import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationSchema = z.object({
    organization_id: z.string(),
    name: z.string(),
    contact_name: z.string().optional(),
    email: z.string().optional(),
    is_default_org: z.boolean().optional(),
    language_code: z.string().optional(),
    fiscal_year_start_month: z.union([z.string(), z.number()]).optional(),
    account_created_date: z.string().optional(),
    time_zone: z.string().optional(),
    is_dst_active: z.boolean().optional(),
    date_format: z.string().optional(),
    field_separator: z.string().optional(),
    industry_type: z.string().optional(),
    industry_size: z.string().optional(),
    company_id_label: z.string().optional(),
    company_id_value: z.string().optional(),
    tax_id_label: z.string().optional(),
    tax_id_value: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    currency_format: z.string().optional(),
    price_precision: z.number().optional(),
    plan_type: z.number().optional(),
    plan_name: z.string().optional(),
    plan_period: z.string().optional(),
    country_code: z.string().optional(),
    country_name: z.string().optional(),
    org_address: z.string().optional(),
    portal_name: z.string().optional(),
    org_settings: z
        .object({
            is_org_active: z.boolean().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    organizations: z.array(OrganizationSchema)
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    organizations: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List all Zoho Books organizations accessible with the current credentials.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-organizations',
        group: 'Organizations'
    },
    input: z.object({}),
    output: OutputSchema,
    scopes: ['ZohoBooks.fullaccess.ALL'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/organizations/#overview
            endpoint: '/books/v3/organizations',
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

        const organizations = (body.organizations || []).map((item) => {
            const parsed = OrganizationSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected organization format in Zoho Books API response'
                });
            }
            return parsed.data;
        });

        return { organizations };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
