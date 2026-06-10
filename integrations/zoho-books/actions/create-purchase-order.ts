import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemInputSchema = z.object({
    item_id: z.string().describe('Item ID. Example: "260815000000100002"'),
    rate: z.number().describe('Rate per unit. Example: 10'),
    quantity: z.number().describe('Quantity. Example: 2'),
    description: z.string().optional().describe('Description for the line item.'),
    unit: z.string().optional().describe('Unit of measurement.')
});

const InputSchema = z.object({
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    vendor_id: z.string().describe('Vendor ID. Example: "260815000000098001"'),
    line_items: z.array(LineItemInputSchema).min(1).describe('At least one line item is required.'),
    purchaseorder_number: z.string().optional().describe('Purchase order number. Example: "PO-001"'),
    date: z.string().optional().describe('Purchase order date. Format: YYYY-MM-DD. Example: "2026-06-09"'),
    reference_number: z.string().optional().describe('Reference number.'),
    notes: z.string().optional().describe('Notes for the purchase order.'),
    terms: z.string().optional().describe('Terms and conditions.'),
    currency_id: z.string().optional().describe('Currency ID. Example: "260815000000000097"')
});

const LineItemOutputSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional()
});

const PurchaseOrderSchema = z.object({
    purchaseorder_id: z.string().optional(),
    purchaseorder_number: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    date: z.string().optional(),
    total: z.number().optional(),
    line_items: z.array(LineItemOutputSchema).optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorder: PurchaseOrderSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    purchaseorder_number: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    date: z.string().optional(),
    total: z.number().optional(),
    line_items: z.array(LineItemOutputSchema).optional()
});

const action = createAction({
    description: 'Create a purchase order in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.purchaseorders.CREATE'],

    exec: async (nango, input) => {
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

        const requestBody: Record<string, unknown> = {
            vendor_id: input.vendor_id,
            line_items: input.line_items.map((item) => ({
                item_id: item.item_id,
                rate: item.rate,
                quantity: item.quantity,
                ...(item.description !== undefined && { description: item.description }),
                ...(item.unit !== undefined && { unit: item.unit })
            }))
        };

        if (input.purchaseorder_number !== undefined) {
            requestBody['purchaseorder_number'] = input.purchaseorder_number;
        }

        if (input.date !== undefined) {
            requestBody['date'] = input.date;
        }

        if (input.reference_number !== undefined) {
            requestBody['reference_number'] = input.reference_number;
        }

        if (input.notes !== undefined) {
            requestBody['notes'] = input.notes;
        }

        if (input.terms !== undefined) {
            requestBody['terms'] = input.terms;
        }

        if (input.currency_id !== undefined) {
            requestBody['currency_id'] = input.currency_id;
        }

        // https://www.zoho.com/books/api/v3/purchase-order/
        const response = await nango.post({
            endpoint: '/books/v3/purchaseorders',
            params: {
                organization_id: organizationId
            },
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response.',
                details: providerResponse.error.message
            });
        }

        const data = providerResponse.data;

        if (data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: data.message,
                code: data.code
            });
        }

        const po = data.purchaseorder;

        if (!po) {
            throw new nango.ActionError({
                type: 'missing_purchaseorder',
                message: 'Purchase order data missing from provider response.'
            });
        }

        return {
            ...(po.purchaseorder_id !== undefined && { id: po.purchaseorder_id }),
            ...(po.purchaseorder_number !== undefined && { purchaseorder_number: po.purchaseorder_number }),
            ...(po.status !== undefined && { status: po.status }),
            ...(po.vendor_id !== undefined && { vendor_id: po.vendor_id }),
            ...(po.vendor_name !== undefined && { vendor_name: po.vendor_name }),
            ...(po.date !== undefined && { date: po.date }),
            ...(po.total !== undefined && { total: po.total }),
            ...(po.line_items !== undefined && { line_items: po.line_items })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
