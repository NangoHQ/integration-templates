import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist. Example: "927270289".'
            ),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Page number to fetch, taken from the previous response next_page. Omit for the first page. Example: "2".'),
        per_page: z.number().int().positive().optional().describe('Number of tax rates to return per page. Defaults to 200 (the provider maximum).')
    })
    .describe('Input for listing the tax rates configured in a Zoho Inventory organization.');

const TaxSchema = z.object({
    tax_id: z.string().describe('Unique ID of the tax rate. Example: "982000000566009".'),
    tax_name: z.string().describe('Name of the tax rate. Example: "Sales Group".'),
    tax_percentage: z.number().nullable().optional().describe('Tax rate percentage. Example: 10.5.'),
    tax_type: z.string().nullable().optional().describe('Whether the tax is a simple or compound tax. Example: "tax".'),
    tax_factor: z.string().nullable().optional().describe('Tax factor. Mexico edition only.'),
    tax_specific_type: z.string().nullable().optional().describe('Country-specific tax subtype, for example "igst" (India) or "isr" (Mexico).'),
    tax_authority_id: z.string().nullable().optional().describe('ID of the tax authority. United States and Mexico editions only.'),
    tax_authority_name: z.string().nullable().optional().describe('Name of the tax authority.'),
    is_value_added: z.boolean().nullable().optional().describe('Whether the tax is a value-added tax.'),
    is_default_tax: z.boolean().nullable().optional().describe('Whether this is the default tax for the organization.'),
    is_editable: z.boolean().nullable().optional().describe('Whether the tax can be edited.'),
    output_tax_account_name: z.string().nullable().optional().describe('Name of the output (sales) tax account.'),
    purchase_tax_account_name: z.string().nullable().optional().describe('Name of the purchase tax account.'),
    tax_account_id: z.string().nullable().optional().describe('ID of the sales tax account.'),
    purchase_tax_account_id: z.string().nullable().optional().describe('ID of the purchase tax account. Australia and Canada editions only.')
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
    page_context: PageContextSchema.nullable().optional()
});

const OutputSchema = z
    .object({
        taxes: z.array(TaxSchema).describe('Tax rates configured for the organization. Empty when no tax rates exist.'),
        next_page: z.string().optional().describe('Page number to pass as cursor to fetch the next page of tax rates. Absent when there are no more pages.')
    })
    .describe('Tax rates configured in a Zoho Inventory organization.');

/**
 * @tags: [read]
 * @tagReason: Lists the organization's configured tax rates without modifying any provider data.
 * @pitfalls: The provider applies an active-tax filter by default (the response reports an active-tax applied filter) and exposes no parameter to include inactive ones, so deactivated tax rates may be missing from the results.
 */
const action = createAction({
    description: 'List configured sales/purchase tax rates for the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            const orgResponse = await nango.get({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
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
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const page = input.cursor ?? '1';

        // https://www.zoho.com/inventory/api/v1/taxes/#list-taxes
        const response = await nango.get({
            endpoint: '/inventory/v1/settings/taxes',
            params: {
                organization_id: organizationId,
                page: page,
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
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
