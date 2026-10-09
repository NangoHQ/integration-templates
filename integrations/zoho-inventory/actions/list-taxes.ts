import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

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
        per_page: z
            .number()
            .int()
            .min(1)
            .max(200)
            .optional()
            .describe('Number of tax rates to return per page (1-200). Defaults to 200 (the provider maximum).')
    })
    .describe('Input for listing the tax rates configured in a Zoho Inventory organization.');

const TaxSchema = z.object({
    tax_id: z.string().describe('Unique ID of the tax rate. Example: "982000000566009".'),
    tax_name: z.string().describe('Name of the tax rate. Example: "Sales Group".'),
    tax_percentage: z.number().optional().describe('Tax rate percentage. Example: 10.5.'),
    tax_type: z.string().optional().describe('Whether the tax is a simple or compound tax. Example: "tax".'),
    tax_factor: z.string().optional().describe('Tax factor. Mexico edition only.'),
    tax_specific_type: z.string().optional().describe('Country-specific tax subtype, for example "igst" (India) or "isr" (Mexico).'),
    tax_authority_id: z.string().optional().describe('ID of the tax authority. United States and Mexico editions only.'),
    tax_authority_name: z.string().optional().describe('Name of the tax authority.'),
    is_value_added: z.boolean().optional().describe('Whether the tax is a value-added tax.'),
    is_default_tax: z.boolean().optional().describe('Whether this is the default tax for the organization.'),
    is_editable: z.boolean().optional().describe('Whether the tax can be edited.'),
    output_tax_account_name: z.string().optional().describe('Name of the output (sales) tax account.'),
    purchase_tax_account_name: z.string().optional().describe('Name of the purchase tax account.'),
    tax_account_id: z.string().optional().describe('ID of the sales tax account.'),
    purchase_tax_account_id: z.string().optional().describe('ID of the purchase tax account. Australia and Canada editions only.')
});

const ProviderTaxSchema = z.object({
    tax_id: z.string(),
    tax_name: z.string(),
    tax_percentage: z.union([z.number(), z.string()]).nullish(),
    tax_type: z.string().nullish(),
    tax_factor: z.string().nullish(),
    tax_specific_type: z.string().nullish(),
    tax_authority_id: z.string().nullish(),
    tax_authority_name: z.string().nullish(),
    is_value_added: z.boolean().nullish(),
    is_default_tax: z.boolean().nullish(),
    is_editable: z.boolean().nullish(),
    output_tax_account_name: z.string().nullish(),
    purchase_tax_account_name: z.string().nullish(),
    tax_account_id: z.string().nullish(),
    purchase_tax_account_id: z.string().nullish()
});

function mapTax(tax: z.infer<typeof ProviderTaxSchema>): z.infer<typeof TaxSchema> {
    const taxPercentage = toPercentage(tax.tax_percentage);
    return {
        tax_id: tax.tax_id,
        tax_name: tax.tax_name,
        ...(taxPercentage !== undefined && { tax_percentage: taxPercentage }),
        ...(tax.tax_type != null && { tax_type: tax.tax_type }),
        ...(tax.tax_factor != null && { tax_factor: tax.tax_factor }),
        ...(tax.tax_specific_type != null && { tax_specific_type: tax.tax_specific_type }),
        ...(tax.tax_authority_id != null && { tax_authority_id: tax.tax_authority_id }),
        ...(tax.tax_authority_name != null && { tax_authority_name: tax.tax_authority_name }),
        ...(tax.is_value_added != null && { is_value_added: tax.is_value_added }),
        ...(tax.is_default_tax != null && { is_default_tax: tax.is_default_tax }),
        ...(tax.is_editable != null && { is_editable: tax.is_editable }),
        ...(tax.output_tax_account_name != null && { output_tax_account_name: tax.output_tax_account_name }),
        ...(tax.purchase_tax_account_name != null && { purchase_tax_account_name: tax.purchase_tax_account_name }),
        ...(tax.tax_account_id != null && { tax_account_id: tax.tax_account_id }),
        ...(tax.purchase_tax_account_id != null && { purchase_tax_account_id: tax.purchase_tax_account_id })
    };
}

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
    code: z.number(),
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
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

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

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when listing taxes.',
                details: parsedResponse.error.message
            });
        }

        const providerResponse = parsedResponse.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Zoho Inventory returned an error while listing taxes.',
                code: providerResponse.code
            });
        }

        const rawTaxes = providerResponse.taxes ?? [];
        const parsedTaxes: z.infer<typeof TaxSchema>[] = [];

        for (const rawTax of rawTaxes) {
            const parsed = ProviderTaxSchema.safeParse(rawTax);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected tax payload from Zoho Inventory API.',
                    details: parsed.error.message
                });
            }
            parsedTaxes.push(mapTax(parsed.data));
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

// Zoho can send tax_percentage as a numeric string; normalize to a number and drop unparseable values.
function toPercentage(value: number | string | null | undefined): number | undefined {
    if (value == null || value === '') {
        return undefined;
    }
    const percentage = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(percentage) ? percentage : undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
