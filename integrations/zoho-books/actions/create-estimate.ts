import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemInputSchema = z.object({
    item_id: z.string().describe('Unique identifier of the item. Example: "260815000000100002"'),
    rate: z.number().describe('Unit price for the line item'),
    quantity: z.number().describe('Number of units'),
    name: z.string().optional(),
    description: z.string().optional(),
    discount: z.number().optional(),
    tax_id: z.string().optional()
});

const InputSchema = z.object({
    customer_id: z.string().describe('The ID of the customer for whom the estimate is created. Example: "260815000000097001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    line_items: z.array(LineItemInputSchema).describe('Line items for the estimate'),
    estimate_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional().describe('Format: YYYY-MM-DD'),
    expiry_date: z.string().optional().describe('Format: YYYY-MM-DD'),
    notes: z.string().optional(),
    terms: z.string().optional(),
    discount: z.number().optional(),
    is_discount_before_tax: z.boolean().optional(),
    discount_type: z.string().optional(),
    shipping_charge: z.number().optional(),
    adjustment: z.number().optional(),
    adjustment_description: z.string().optional(),
    currency_id: z.string().optional()
});

const LineItemSchema = z
    .object({
        item_id: z.string().optional(),
        line_item_id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        rate: z.number().optional(),
        quantity: z.number().optional(),
        item_total: z.number().optional()
    })
    .passthrough();

const EstimateSchema = z
    .object({
        estimate_id: z.string(),
        estimate_number: z.string().optional(),
        date: z.string().optional(),
        status: z.string().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        total: z.number().optional(),
        sub_total: z.number().optional(),
        line_items: z.array(LineItemSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    estimate: EstimateSchema
});

const action = createAction({
    description: 'Create an estimate in Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-estimate',
        group: 'Estimates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.estimates.CREATE', 'ZohoBooks.settings.READ'],

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

        // https://www.zoho.com/books/api/v3/estimates/#create-an-estimate
        const response = await nango.post({
            endpoint: '/books/v3/estimates',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                line_items: input.line_items,
                ...(input.estimate_number !== undefined && { estimate_number: input.estimate_number }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.expiry_date !== undefined && { expiry_date: input.expiry_date }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms }),
                ...(input.discount !== undefined && { discount: input.discount }),
                ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
                ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
                ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
                ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
                ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id })
            },
            retries: 3
        });

        if (response.data == null) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received empty response from Zoho Books'
            });
        }

        const parsed = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                estimate: z.unknown()
            })
            .parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.message || 'Estimate creation failed',
                code: parsed.code
            });
        }

        const estimate = EstimateSchema.parse(parsed.estimate);

        return {
            estimate
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
