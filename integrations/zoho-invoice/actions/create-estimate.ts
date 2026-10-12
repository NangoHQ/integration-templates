import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    item_id: z.string().optional().describe('Catalog item ID. Omit to create an ad-hoc line item without a catalog entry.'),
    name: z.string().optional().describe('Line item name.'),
    description: z.string().optional().describe('Line item description.'),
    rate: z.number().describe('Rate per unit.'),
    quantity: z.number().describe('Quantity of the line item.'),
    unit: z.string().optional().describe('Unit of measure, e.g. "hours" or "kgs".'),
    discount: z.union([z.string(), z.number()]).optional().describe('Line item discount as a flat amount or a percentage string such as "10%".'),
    tax_id: z.string().optional().describe('ID of the tax or tax group to apply to the line item.'),
    item_order: z.number().optional().describe('Position of the line item on the estimate.')
});

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Required by every estimate endpoint.'),
        customer_id: z.string().describe('ID of the customer the estimate is for.'),
        line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the estimate. At least one is required.'),
        date: z.string().optional().describe('Estimate date in YYYY-MM-DD format. Defaults to today.'),
        expiry_date: z.string().optional().describe('Expiry date in YYYY-MM-DD format.'),
        estimate_number: z.string().optional().describe('Estimate number to use. Only honored when ignore_auto_number_generation is true.'),
        reference_number: z.string().optional().describe('Transaction reference number.'),
        discount: z.union([z.string(), z.number()]).optional().describe('Entity-level discount as a flat amount or a percentage string such as "10%".'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        discount_type: z.enum(['entity_level', 'item_level']).optional().describe('Whether the discount applies to the whole estimate or per line item.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are inclusive of tax.'),
        notes: z.string().optional().describe('Notes shown at the bottom of the estimate.'),
        terms: z.string().optional().describe('Terms and conditions for the estimate.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the estimate.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the estimate.'),
        adjustment_description: z.string().optional().describe('Description of the adjustment.'),
        project_id: z.string().optional().describe('ID of a project to associate with the estimate.'),
        template_id: z.string().optional().describe('ID of the estimate template to use.'),
        contact_persons: z.array(z.string()).optional().describe('IDs of contact persons to whom the estimate is addressed.'),
        send: z.boolean().optional().describe("When true, immediately emails the estimate to the customer's contact persons."),
        ignore_auto_number_generation: z.boolean().optional().describe('When true, uses estimate_number instead of auto-generating one.')
    })
    .describe('Input for creating a Zoho Invoice estimate (quote).');

const ProviderLineItemSchema = z.object({
    item_id: z.string().nullish(),
    line_item_id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    rate: z.number().nullish(),
    quantity: z.number().nullish(),
    unit: z.string().nullish(),
    item_total: z.number().nullish()
});

const ProviderEstimateSchema = z.object({
    estimate_id: z.string(),
    estimate_number: z.string().nullish(),
    status: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    date: z.string().nullish(),
    expiry_date: z.string().nullish(),
    reference_number: z.string().nullish(),
    currency_code: z.string().nullish(),
    sub_total: z.number().nullish(),
    tax_total: z.number().nullish(),
    total: z.number().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    line_items: z.array(ProviderLineItemSchema).nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    estimate: ProviderEstimateSchema
});

const OutputLineItemSchema = z.object({
    item_id: z.string().optional().describe('Catalog item ID, or an empty string for an ad-hoc line item.'),
    line_item_id: z.string().optional().describe('Unique ID of the line item within the estimate.'),
    name: z.string().optional().describe('Line item name.'),
    description: z.string().optional().describe('Line item description.'),
    rate: z.number().optional().describe('Rate per unit.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    unit: z.string().optional().describe('Unit of measure.'),
    item_total: z.number().optional().describe('Computed total for the line item.')
});

const OutputSchema = z
    .object({
        estimate_id: z.string().describe('Unique ID of the created estimate.'),
        estimate_number: z.string().optional().describe('Estimate number assigned by Zoho.'),
        status: z.string().optional().describe('Estimate status, e.g. "draft".'),
        customer_id: z.string().optional().describe('ID of the customer the estimate belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer the estimate belongs to.'),
        date: z.string().optional().describe('Estimate date in YYYY-MM-DD format.'),
        expiry_date: z.string().optional().describe('Expiry date in YYYY-MM-DD format.'),
        reference_number: z.string().optional().describe('Transaction reference number.'),
        currency_code: z.string().optional().describe('ISO currency code of the estimate.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax and discounts.'),
        tax_total: z.number().optional().describe('Total tax applied to the estimate.'),
        total: z.number().optional().describe('Final total of the estimate.'),
        created_time: z.string().optional().describe('Timestamp when the estimate was created.'),
        last_modified_time: z.string().optional().describe('Timestamp when the estimate was last modified.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items on the created estimate.')
    })
    .describe('The created Zoho Invoice estimate (quote).');

/**
 * @tags: [write]
 * @tagReason: Creates a new estimate (quote) in Zoho Invoice.
 * @pitfalls: organization_id is required and cannot be looked up with this connection's granted scopes; line items need rate and quantity but item_id is optional; send=true immediately emails the estimate to the customer's contact persons; plans with a transaction cap may reject the create with a plan-limit error.
 */
const action = createAction({
    description:
        'Create a new estimate (quote) for a customer. Line items do not require a catalog item_id - ad-hoc line items (name/rate/quantity only) work.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            customer_id: input.customer_id,
            line_items: input.line_items.map((item) => ({
                ...(item.item_id !== undefined && { item_id: item.item_id }),
                ...(item.name !== undefined && { name: item.name }),
                ...(item.description !== undefined && { description: item.description }),
                rate: item.rate,
                quantity: item.quantity,
                ...(item.unit !== undefined && { unit: item.unit }),
                ...(item.discount !== undefined && { discount: item.discount }),
                ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                ...(item.item_order !== undefined && { item_order: item.item_order })
            })),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.expiry_date !== undefined && { expiry_date: input.expiry_date }),
            ...(input.estimate_number !== undefined && { estimate_number: input.estimate_number }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.project_id !== undefined && { project_id: input.project_id }),
            ...(input.template_id !== undefined && { template_id: input.template_id }),
            ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons })
        };

        // https://www.zoho.com/invoice/api/v3/estimates/#create-an-estimate
        const response = await nango.post({
            endpoint: '/invoice/v3/estimates',
            params: {
                organization_id: input.organization_id,
                ...(input.send !== undefined && { send: input.send ? 'true' : 'false' }),
                ...(input.ignore_auto_number_generation !== undefined && {
                    ignore_auto_number_generation: input.ignore_auto_number_generation ? 'true' : 'false'
                })
            },
            data,
            // Non-idempotent create with no idempotency key: a retry after a lost response would create a duplicate estimate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        const estimate = providerResponse.estimate;

        return {
            estimate_id: estimate.estimate_id,
            ...(estimate.estimate_number != null && { estimate_number: estimate.estimate_number }),
            ...(estimate.status != null && { status: estimate.status }),
            ...(estimate.customer_id != null && { customer_id: estimate.customer_id }),
            ...(estimate.customer_name != null && { customer_name: estimate.customer_name }),
            ...(estimate.date != null && { date: estimate.date }),
            ...(estimate.expiry_date != null && { expiry_date: estimate.expiry_date }),
            ...(estimate.reference_number != null && { reference_number: estimate.reference_number }),
            ...(estimate.currency_code != null && { currency_code: estimate.currency_code }),
            ...(estimate.sub_total != null && { sub_total: estimate.sub_total }),
            ...(estimate.tax_total != null && { tax_total: estimate.tax_total }),
            ...(estimate.total != null && { total: estimate.total }),
            ...(estimate.created_time != null && { created_time: estimate.created_time }),
            ...(estimate.last_modified_time != null && { last_modified_time: estimate.last_modified_time }),
            ...(estimate.line_items != null && {
                line_items: estimate.line_items.map((item) => ({
                    ...(item.item_id != null && { item_id: item.item_id }),
                    ...(item.line_item_id != null && { line_item_id: item.line_item_id }),
                    ...(item.name != null && { name: item.name }),
                    ...(item.description != null && { description: item.description }),
                    ...(item.rate != null && { rate: item.rate }),
                    ...(item.quantity != null && { quantity: item.quantity }),
                    ...(item.unit != null && { unit: item.unit }),
                    ...(item.item_total != null && { item_total: item.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
