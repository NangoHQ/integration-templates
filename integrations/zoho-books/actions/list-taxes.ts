import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records to be fetched per page.'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const TaxSchema = z.object({
    tax_id: z.string(),
    tax_name: z.string(),
    tax_percentage: z.number().optional(),
    tax_type: z.string().optional(),
    tax_factor: z.string().optional(),
    tax_specific_type: z.string().optional(),
    tax_authority_id: z.string().optional(),
    tax_authority_name: z.string().optional(),
    is_value_added: z.boolean().optional(),
    is_default_tax: z.boolean().optional(),
    is_editable: z.boolean().optional(),
    output_tax_account_name: z.string().optional(),
    purchase_tax_account_name: z.string().optional(),
    tax_account_id: z.string().optional(),
    purchase_tax_account_id: z.string().optional()
});

const PageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    taxes: z.array(z.unknown()).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z.object({
    taxes: z.array(TaxSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List taxes configured in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-taxes',
        group: 'Settings'
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
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
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

        const page = input.cursor ?? '1';
        const perPage = input.per_page ?? 200;

        // https://www.zoho.com/books/api/v3/taxes/#list-taxes
        const response = await nango.get({
            endpoint: '/books/v3/settings/taxes',
            params: {
                organization_id: organizationId,
                page: page,
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const rawTaxes = providerResponse.taxes ?? [];
        const parsedTaxes: z.infer<typeof TaxSchema>[] = [];

        for (const rawTax of rawTaxes) {
            const parsed = TaxSchema.safeParse(rawTax);
            if (parsed.success) {
                parsedTaxes.push(parsed.data);
            }
        }

        const pageContext = providerResponse.page_context;
        const hasMorePage = pageContext?.has_more_page ?? false;
        const currentPage = pageContext?.page ?? Number(page);

        return {
            taxes: parsedTaxes,
            ...(hasMorePage && { next_page: String(currentPage + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
