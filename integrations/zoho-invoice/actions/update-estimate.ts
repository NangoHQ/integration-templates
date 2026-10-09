import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    item_id: z.string().optional().describe('Unique ID of a catalog item. Omit to send a free-text line item; this connection cannot read the Items catalog.'),
    name: z.string().optional().describe('Name of the line item. Example: "Consulting hours"'),
    description: z.string().optional().describe('Description of the line item.'),
    rate: z.number().describe('Unit price of the line item. Example: 150'),
    quantity: z.number().describe('Number of units. Example: 2'),
    unit: z.string().optional().describe('Unit of measure. Example: "hours"'),
    discount: z.number().optional().describe('Flat discount amount applied to the line item.'),
    tax_id: z.string().optional().describe('ID of the tax or tax group applied to the line item.')
});

const CustomFieldInputSchema = z.object({
    label: z.string().describe('Label of the custom field. Example: "PO Number"'),
    value: z.string().describe('Value to store for the custom field. Example: "PO-1042"')
});

const InputSchema = z
    .object({
        estimate_id: z.string().describe('Unique ID of the estimate to update. Example: "260815000000166021"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required by the provider on every call and cannot be discovered with this connection\'s scopes, so supply it explicitly. Example: "927270289"'
            ),
        customer_id: z.string().describe('ID of the customer the estimate is raised for. Required by the provider on update. Example: "260815000000097001"'),
        line_items: z.array(LineItemInputSchema).describe('Full replacement for the estimate line items; omit an item to remove it.'),
        contact_persons: z.array(z.string()).optional().describe('Contact person IDs to associate with the estimate.'),
        estimate_number: z.string().optional().describe('Estimate serial number. Example: "QT-000010"'),
        reference_number: z.string().optional().describe('Transaction reference number. Example: "REF-001"'),
        date: z.string().optional().describe('Estimate date in YYYY-MM-DD format. Example: "2026-10-09"'),
        expiry_date: z.string().optional().describe('Expiry date in YYYY-MM-DD format. Example: "2026-10-31"'),
        exchange_rate: z.number().optional().describe('Foreign exchange rate of the estimate currency.'),
        discount: z.number().optional().describe('Entity-level discount as a flat amount.'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        discount_type: z.string().optional().describe('How the discount is specified: "entity_level" or "item_level".'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are inclusive of tax.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the estimate.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the estimate.'),
        adjustment_description: z.string().optional().describe('Description of the adjustment. Example: "Rounding off"'),
        notes: z.string().optional().describe('Notes shown on the estimate.'),
        terms: z.string().optional().describe('Terms and conditions shown on the estimate.'),
        template_id: z.string().optional().describe('ID of the estimate template to use.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson.'),
        project_id: z.string().optional().describe('ID of the project associated with the estimate.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom field values to set on the estimate.')
    })
    .describe('Fields used to update an existing Zoho Invoice estimate.');

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the line item.'),
    item_id: z.string().optional().describe('Catalog item ID, if the line item references one.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    rate: z.number().optional().describe('Unit price of the line item.'),
    quantity: z.number().optional().describe('Number of units.'),
    unit: z.string().optional().describe('Unit of measure.'),
    item_total: z.number().optional().describe('Total for the line item.'),
    tax_id: z.string().optional().describe('ID of the tax or tax group applied to the line item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.')
});

const OutputSchema = z
    .object({
        estimate_id: z.string().describe('Unique ID of the updated estimate.'),
        estimate_number: z.string().optional().describe('Estimate serial number.'),
        status: z.string().optional().describe('Estimate status. Example: "draft"'),
        reference_number: z.string().optional().describe('Transaction reference number.'),
        date: z.string().optional().describe('Estimate date.'),
        expiry_date: z.string().optional().describe('Estimate expiry date.'),
        customer_id: z.string().optional().describe('ID of the customer the estimate belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer.'),
        currency_code: z.string().optional().describe('Currency code of the estimate.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax.'),
        tax_total: z.number().optional().describe('Total tax applied to the estimate.'),
        total: z.number().optional().describe('Final estimate total.'),
        notes: z.string().optional().describe('Notes shown on the estimate.'),
        terms: z.string().optional().describe('Terms and conditions shown on the estimate.'),
        last_modified_time: z.string().optional().describe('Timestamp of the last modification.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items on the updated estimate.')
    })
    .describe('The updated Zoho Invoice estimate.');

const ProviderLineItemSchema = z
    .object({
        line_item_id: z.union([z.string(), z.number()]).nullable().optional(),
        item_id: z.union([z.string(), z.number()]).nullable().optional(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        rate: z.number().nullable().optional(),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        item_total: z.number().nullable().optional(),
        tax_id: z.union([z.string(), z.number()]).nullable().optional(),
        tax_name: z.string().nullable().optional(),
        tax_percentage: z.number().nullable().optional()
    })
    .passthrough();

const ProviderEstimateSchema = z
    .object({
        estimate_id: z.union([z.string(), z.number()]).nullable().optional(),
        estimate_number: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        reference_number: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        expiry_date: z.string().nullable().optional(),
        customer_id: z.union([z.string(), z.number()]).nullable().optional(),
        customer_name: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        sub_total: z.number().nullable().optional(),
        tax_total: z.number().nullable().optional(),
        total: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
        terms: z.string().nullable().optional(),
        last_modified_time: z.string().nullable().optional(),
        line_items: z.array(ProviderLineItemSchema).nullable().optional()
    })
    .passthrough();

const UpdateEstimateResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    estimate: ProviderEstimateSchema.optional()
});

function toId(value: string | number | null | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}

/**
 * @tags: [write]
 * @tagReason: Updates an existing estimate in the provider, replacing its line items and mutating stored estimate data.
 * @pitfalls: line_items fully replaces the estimate's line items (omit an item to delete it) and customer_id plus line_items are required on every update; organization_id cannot be discovered with this connection's scopes so supply it explicitly; unset string fields come back as empty strings rather than omitted.
 */
const action = createAction({
    description: 'Update an existing estimate in Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            customer_id: input.customer_id,
            line_items: input.line_items,
            ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons }),
            ...(input.estimate_number !== undefined && { estimate_number: input.estimate_number }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.expiry_date !== undefined && { expiry_date: input.expiry_date }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.template_id !== undefined && { template_id: input.template_id }),
            ...(input.salesperson_name !== undefined && { salesperson_name: input.salesperson_name }),
            ...(input.project_id !== undefined && { project_id: input.project_id }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        // https://www.zoho.com/invoice/api/v3/estimates/#update-an-estimate
        const response = await nango.put({
            endpoint: `/invoice/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data,
            retries: 1
        });

        const parsed = UpdateEstimateResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.message || 'Estimate update failed',
                code: parsed.code
            });
        }

        if (!parsed.estimate) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Zoho Invoice did not return the updated estimate.'
            });
        }

        const estimate = parsed.estimate;
        const estimateId = toId(estimate.estimate_id);
        const customerId = toId(estimate.customer_id);

        if (estimateId === undefined) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Zoho Invoice did not return an estimate ID.'
            });
        }

        const lineItems = estimate.line_items?.map((item) => {
            const lineItemId = toId(item.line_item_id);
            const itemId = toId(item.item_id);
            const taxId = toId(item.tax_id);

            return {
                ...(lineItemId !== undefined && { line_item_id: lineItemId }),
                ...(itemId !== undefined && { item_id: itemId }),
                ...(item.name != null && { name: item.name }),
                ...(item.description != null && { description: item.description }),
                ...(item.rate != null && { rate: item.rate }),
                ...(item.quantity != null && { quantity: item.quantity }),
                ...(item.unit != null && { unit: item.unit }),
                ...(item.item_total != null && { item_total: item.item_total }),
                ...(taxId !== undefined && { tax_id: taxId }),
                ...(item.tax_name != null && { tax_name: item.tax_name }),
                ...(item.tax_percentage != null && { tax_percentage: item.tax_percentage })
            };
        });

        return {
            estimate_id: estimateId,
            ...(estimate.estimate_number != null && { estimate_number: estimate.estimate_number }),
            ...(estimate.status != null && { status: estimate.status }),
            ...(estimate.reference_number != null && { reference_number: estimate.reference_number }),
            ...(estimate.date != null && { date: estimate.date }),
            ...(estimate.expiry_date != null && { expiry_date: estimate.expiry_date }),
            ...(customerId !== undefined && { customer_id: customerId }),
            ...(estimate.customer_name != null && { customer_name: estimate.customer_name }),
            ...(estimate.currency_code != null && { currency_code: estimate.currency_code }),
            ...(estimate.sub_total != null && { sub_total: estimate.sub_total }),
            ...(estimate.tax_total != null && { tax_total: estimate.tax_total }),
            ...(estimate.total != null && { total: estimate.total }),
            ...(estimate.notes != null && { notes: estimate.notes }),
            ...(estimate.terms != null && { terms: estimate.terms }),
            ...(estimate.last_modified_time != null && { last_modified_time: estimate.last_modified_time }),
            ...(lineItems !== undefined && { line_items: lineItems })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
