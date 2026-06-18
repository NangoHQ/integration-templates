import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemSchema = z.object({
    item_id: z.string().optional(),
    line_item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    discount: z.number().optional(),
    tax_id: z.string().optional(),
    item_order: z.number().optional()
});

const InputSchema = z.object({
    estimate_id: z.string().describe('The estimate ID to update. Example: "260815000000101017"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    customer_id: z.string().optional().describe('Customer ID for the estimate. Example: "260815000000097001"'),
    date: z.string().optional().describe('Estimate date. Example: "2026-06-09"'),
    expiry_date: z.string().optional().describe('Expiry date. Example: "2026-06-30"'),
    reference_number: z.string().optional().describe('Reference number. Example: "REF-001"'),
    notes: z.string().optional().describe('Notes for the estimate.'),
    terms: z.string().optional().describe('Terms and conditions.'),
    line_items: z.array(LineItemSchema).optional().describe('Line items for the estimate.')
});

const EstimateResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    estimate: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    estimate_id: z.string().optional(),
    estimate_number: z.string().optional(),
    status: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    date: z.string().optional(),
    expiry_date: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    total: z.number().optional(),
    sub_total: z.number().optional()
});

const action = createAction({
    description: 'Update an estimate in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.estimates.UPDATE', 'ZohoBooks.settings.READ'],

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

        const params: Record<string, string | number | string[] | number[]> = {
            organization_id: organizationId
        };

        const data: Record<string, unknown> = {};

        if (input.customer_id !== undefined) {
            data['customer_id'] = input.customer_id;
        }
        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.expiry_date !== undefined) {
            data['expiry_date'] = input.expiry_date;
        }
        if (input.reference_number !== undefined) {
            data['reference_number'] = input.reference_number;
        }
        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.terms !== undefined) {
            data['terms'] = input.terms;
        }
        if (input.line_items !== undefined) {
            data['line_items'] = input.line_items;
        }

        // https://www.zoho.com/books/api/v3/estimates/#update-an-estimate
        const response = await nango.put({
            endpoint: `/books/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params,
            data,
            retries: 1
        });

        const parsed = EstimateResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.message
            });
        }

        const estimate = parsed.estimate ?? {};

        const totalValue = estimate['total'];
        const subTotalValue = estimate['sub_total'];

        return {
            estimate_id: typeof estimate['estimate_id'] === 'string' ? estimate['estimate_id'] : undefined,
            estimate_number: typeof estimate['estimate_number'] === 'string' ? estimate['estimate_number'] : undefined,
            status: typeof estimate['status'] === 'string' ? estimate['status'] : undefined,
            reference_number: typeof estimate['reference_number'] === 'string' ? estimate['reference_number'] : undefined,
            notes: typeof estimate['notes'] === 'string' ? estimate['notes'] : undefined,
            terms: typeof estimate['terms'] === 'string' ? estimate['terms'] : undefined,
            date: typeof estimate['date'] === 'string' ? estimate['date'] : undefined,
            expiry_date: typeof estimate['expiry_date'] === 'string' ? estimate['expiry_date'] : undefined,
            customer_id: typeof estimate['customer_id'] === 'string' ? estimate['customer_id'] : undefined,
            customer_name: typeof estimate['customer_name'] === 'string' ? estimate['customer_name'] : undefined,
            total: typeof totalValue === 'number' ? totalValue : undefined,
            sub_total: typeof subTotalValue === 'number' ? subTotalValue : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
