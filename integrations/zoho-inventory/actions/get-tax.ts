import { z } from 'zod';
import { createAction } from 'nango';

const TAX_NOT_FOUND_CODE = 1002;

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

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
    tax_percentage: z.union([z.number(), z.string()]).optional().describe('Tax rate percentage, e.g. 10.5.'),
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

const OutputSchema = z
    .object({
        found: z.boolean().describe('Whether a tax with the requested tax_id exists in the organization.'),
        tax: TaxSchema.optional().describe('Details of the configured tax rate, present only when found is true.'),
        code: z.number().optional().describe('Zoho Inventory status code from the response (0 on success, 1002 when the tax does not exist).'),
        message: z.string().optional().describe('Zoho Inventory status message from the response.')
    })
    .describe('Result of looking up a tax rate: found indicates whether the tax exists, and tax carries its details when found.');

const ResponseWrapperSchema = z.object({
    code: z.number().optional(),
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
                tax_id: input.tax_id
            });
        }

        const body = parsedBody.data;
        const taxContainer = body.tax;
        let rawTax: unknown = taxContainer;
        if (Array.isArray(taxContainer)) {
            rawTax = taxContainer.length > 0 ? taxContainer[0] : undefined;
        }

        if (body.code !== undefined && body.code !== 0 && body.code !== TAX_NOT_FOUND_CODE) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message ?? 'Failed to retrieve tax from Zoho Inventory.',
                tax_id: input.tax_id
            });
        }

        if (rawTax !== undefined && rawTax !== null && typeof rawTax === 'object' && !Array.isArray(rawTax)) {
            return {
                found: true,
                tax: TaxSchema.parse(rawTax),
                ...(body.code !== undefined && { code: body.code }),
                ...(body.message !== undefined && { message: body.message })
            };
        }

        return {
            found: false,
            ...(body.code !== undefined && { code: body.code }),
            ...(body.message !== undefined && { message: body.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
