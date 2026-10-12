import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const TAX_NOT_FOUND_CODE = 1002;

const InputSchema = z
    .object({
        tax_id: z.string().describe('Unique identifier of the tax to retrieve. Example: "982000000566009"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving a single configured tax rate by ID.');

const TaxSchema = z.object({
    tax_id: z.string().describe('Unique identifier of the tax.'),
    tax_name: z.string().optional().describe('Display name of the tax, e.g. "Sales Group".'),
    tax_percentage: z.number().optional().describe('Tax rate percentage, e.g. 10.5.'),
    tax_type: z.string().optional().describe('Type of the tax, e.g. "tax".'),
    tax_factor: z.string().optional().describe('Whether the tax is charged as a percentage rate or a fixed amount, e.g. "rate".'),
    tds_payable_account_id: z.string().optional().describe('ID of the TDS payable account associated with the tax.'),
    tax_authority_id: z.string().optional().describe('ID of the tax authority that collects the tax.'),
    tax_authority_name: z.string().optional().describe('Name of the tax authority that collects the tax.'),
    is_value_added: z.boolean().optional().describe('Whether the tax is a value-added tax.'),
    tax_specific_type: z.string().optional().describe('Provider-specific classification of the tax.'),
    country: z.string().optional().describe('Country associated with the tax.'),
    country_code: z.string().optional().describe('Two-letter country code associated with the tax.'),
    purchase_tax_expense_account_id: z.string().optional().describe('ID of the purchase tax expense account linked to the tax.')
});

// Zoho returns null for unset optional tax attributes (for example tax_authority_id on a tax with no
// authority, or region-specific fields such as tds_payable_account_id), so every optional field accepts null.
const ProviderTaxSchema = z.object({
    tax_id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    tax_name: z.string().nullish(),
    tax_percentage: z.union([z.number(), z.string()]).nullish(),
    tax_type: z.string().nullish(),
    tax_factor: z.string().nullish(),
    tds_payable_account_id: z.string().nullish(),
    tax_authority_id: z.string().nullish(),
    tax_authority_name: z.string().nullish(),
    is_value_added: z.boolean().nullish(),
    tax_specific_type: z.string().nullish(),
    country: z.string().nullish(),
    country_code: z.string().nullish(),
    purchase_tax_expense_account_id: z.string().nullish()
});

function mapTax(tax: z.infer<typeof ProviderTaxSchema>): z.infer<typeof TaxSchema> {
    const taxPercentage = toPercentage(tax.tax_percentage);
    return {
        tax_id: tax.tax_id,
        ...(tax.tax_name != null && { tax_name: tax.tax_name }),
        ...(taxPercentage !== undefined && { tax_percentage: taxPercentage }),
        ...(tax.tax_type != null && { tax_type: tax.tax_type }),
        ...(tax.tax_factor != null && { tax_factor: tax.tax_factor }),
        ...(tax.tds_payable_account_id != null && { tds_payable_account_id: tax.tds_payable_account_id }),
        ...(tax.tax_authority_id != null && { tax_authority_id: tax.tax_authority_id }),
        ...(tax.tax_authority_name != null && { tax_authority_name: tax.tax_authority_name }),
        ...(tax.is_value_added != null && { is_value_added: tax.is_value_added }),
        ...(tax.tax_specific_type != null && { tax_specific_type: tax.tax_specific_type }),
        ...(tax.country != null && { country: tax.country }),
        ...(tax.country_code != null && { country_code: tax.country_code }),
        ...(tax.purchase_tax_expense_account_id != null && { purchase_tax_expense_account_id: tax.purchase_tax_expense_account_id })
    };
}

const OutputSchema = z
    .object({
        found: z.boolean().describe('Whether a tax with the requested tax_id exists in the organization.'),
        tax: TaxSchema.optional().describe('Details of the configured tax rate, present only when found is true.'),
        code: z.number().optional().describe('Zoho Inventory status code from the response (0 on success, 1002 when the tax does not exist).'),
        message: z.string().optional().describe('Zoho Inventory status message from the response.')
    })
    .describe('Result of looking up a tax rate: found indicates whether the tax exists, and tax carries its details when found.');

const ResponseWrapperSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    tax: z.unknown().optional()
});

function extractErrorResponse(error: unknown): { status: number; data: unknown } | undefined {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return undefined;
    }
    const status = response.status;
    if (typeof status !== 'number') {
        return undefined;
    }
    const data = 'data' in response ? response.data : undefined;
    return { status, data };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single configured tax rate from the provider without modifying any provider state.
 * @pitfalls: A tax_id that does not exist does not throw: it returns found:false with the provider's code/message, so callers must check found. When the account has more than one organization, organization_id must be supplied or the call is rejected.
 */
const action = createAction({
    description: 'Get details for one configured tax rate by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        let providerBody: unknown = undefined;
        // @allowTryCatch: The provider returns HTTP 404 with a structured body when the tax does not exist; capture that body so the caller receives a controlled not-found result instead of an unhandled error.
        try {
            // https://www.zoho.com/inventory/api/v1/taxes/#get-a-tax
            const response = await nango.get({
                endpoint: `/inventory/v1/settings/taxes/${encodeURIComponent(input.tax_id)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            });
            providerBody = response.data;
        } catch (error) {
            const failure = extractErrorResponse(error);
            if (failure === undefined || failure.status !== 404) {
                throw error;
            }
            providerBody = failure.data;
        }

        const parsedBody = ResponseWrapperSchema.safeParse(providerBody);
        if (!parsedBody.success) {
            if (providerBody === undefined || providerBody === null) {
                return { found: false };
            }
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho Inventory API.',
                details: parsedBody.error.message,
                tax_id: input.tax_id
            });
        }

        const body = parsedBody.data;
        const taxContainer = body.tax;
        let rawTax: unknown = taxContainer;
        if (Array.isArray(taxContainer)) {
            rawTax = taxContainer.length > 0 ? taxContainer[0] : undefined;
        }

        if (body.code !== 0 && body.code !== TAX_NOT_FOUND_CODE) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message ?? 'Failed to retrieve tax from Zoho Inventory.',
                code: body.code,
                tax_id: input.tax_id
            });
        }

        if (body.code === 0 && rawTax !== undefined && rawTax !== null && typeof rawTax === 'object' && !Array.isArray(rawTax)) {
            const parsedTax = ProviderTaxSchema.safeParse(rawTax);
            if (!parsedTax.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected tax payload from Zoho Inventory API.',
                    details: parsedTax.error.message,
                    tax_id: input.tax_id
                });
            }

            return {
                found: true,
                tax: mapTax(parsedTax.data),
                code: body.code,
                ...(body.message !== undefined && { message: body.message })
            };
        }

        return {
            found: false,
            code: body.code,
            ...(body.message !== undefined && { message: body.message })
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
