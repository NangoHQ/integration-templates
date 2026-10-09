import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    item_id: z.string().describe('ID of the item to order. Example: "260815000000101002"'),
    quantity: z.number().describe('Quantity ordered. Example: 2'),
    rate: z.number().optional().describe("Unit price. Defaults to the item's selling price when omitted."),
    name: z.string().optional().describe('Line item name override.'),
    description: z.string().optional().describe('Line item description.'),
    unit: z.string().optional().describe('Unit of measure. Example: "qty"'),
    discount: z.number().optional().describe('Line item discount percentage; requires discount_type "item_level".'),
    tax_id: z.string().optional().describe('ID of the tax applied to this line item.'),
    location_id: z.string().optional().describe('Location (warehouse) ID for this line item.')
});

const InputSchema = z
    .object({
        customer_id: z.string().describe('ID of the customer the sales order is for.'),
        line_items: z.array(LineItemInputSchema).min(1).describe('Line items to order; at least one is required.'),
        salesorder_number: z.string().optional().describe('Custom sales order number; Zoho assigns one when omitted.'),
        date: z.string().optional().describe('Sales order date in YYYY-MM-DD format. Defaults to today.'),
        shipment_date: z.string().optional().describe('Expected shipment date in YYYY-MM-DD format.'),
        reference_number: z.string().optional().describe('Caller reference number for the order.'),
        discount: z.string().optional().describe('Entity-level discount value, e.g. "20.00%"; requires discount_type "entity_level".'),
        discount_type: z
            .enum(['entity_level', 'item_level'])
            .optional()
            .describe('Whether the discount applies to the whole order or to individual line items.'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are tax inclusive.'),
        shipping_charge: z.number().optional().describe('Shipping charge added to the order total.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the order total.'),
        adjustment_description: z.string().optional().describe('Reason for the adjustment.'),
        notes: z.string().optional().describe('Notes shown on the sales order.'),
        terms: z.string().optional().describe('Terms and conditions shown on the sales order.'),
        location_id: z.string().optional().describe('Location (warehouse) ID for the order.'),
        organization_id: z.string().optional().describe("Zoho Inventory organization ID. Defaults to the connection's first organization.")
    })
    .describe('Input for creating a Zoho Inventory sales order.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.coerce.string(),
    item_id: z.coerce.string(),
    name: z.coerce.string().optional(),
    quantity: z.coerce.number().optional(),
    rate: z.coerce.number().optional(),
    item_total: z.coerce.number().optional(),
    unit: z.coerce.string().optional()
});

const ProviderSalesOrderSchema = z.object({
    salesorder_id: z.coerce.string(),
    salesorder_number: z.coerce.string(),
    date: z.coerce.string(),
    status: z.coerce.string().optional(),
    order_status: z.coerce.string().optional(),
    shipment_date: z.coerce.string().optional(),
    reference_number: z.coerce.string().optional(),
    customer_id: z.coerce.string(),
    customer_name: z.coerce.string().optional(),
    currency_code: z.coerce.string().optional(),
    sub_total: z.coerce.number().optional(),
    tax_total: z.coerce.number().optional(),
    total: z.coerce.number().optional(),
    total_quantity: z.coerce.number().optional(),
    is_inclusive_tax: z.boolean().optional(),
    created_time: z.coerce.string().optional(),
    last_modified_time: z.coerce.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const ProviderSalesOrderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    salesorder: ProviderSalesOrderSchema.optional()
});

const ProviderOrganizationSchema = z.object({
    organization_id: z.coerce.string()
});

const ProviderOrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(ProviderOrganizationSchema).optional()
});

const LineItemOutputSchema = z.object({
    line_item_id: z.string().describe('Unique ID of the line item within the sales order.'),
    item_id: z.string().describe('ID of the ordered item.'),
    name: z.string().optional().describe('Item name.'),
    quantity: z.number().optional().describe('Quantity ordered.'),
    rate: z.number().optional().describe('Unit price.'),
    item_total: z.number().optional().describe('Line total (quantity multiplied by rate).'),
    unit: z.string().optional().describe('Unit of measure.')
});

const OutputSchema = z
    .object({
        salesorder_id: z.string().describe('Unique ID of the created sales order.'),
        salesorder_number: z.string().describe('Sales order number assigned by Zoho.'),
        date: z.string().describe('Sales order date in YYYY-MM-DD format.'),
        status: z.string().optional().describe('Fulfillment status of the sales order, e.g. "draft" or "fulfilled".'),
        order_status: z.string().optional().describe('Workflow status of the sales order, e.g. "draft", "confirmed" or "void".'),
        shipment_date: z.string().optional().describe('Expected shipment date; empty when not set.'),
        reference_number: z.string().optional().describe('Caller reference number.'),
        customer_id: z.string().describe('ID of the customer the sales order belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer.'),
        currency_code: z.string().optional().describe('Currency code of the sales order.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax.'),
        tax_total: z.number().optional().describe('Total tax amount.'),
        total: z.number().optional().describe('Total amount of the sales order.'),
        total_quantity: z.number().optional().describe('Total quantity across all line items.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are tax inclusive.'),
        created_time: z.string().optional().describe('Creation timestamp.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp.'),
        line_items: z.array(LineItemOutputSchema).describe('Line items of the created sales order.')
    })
    .describe('The created Zoho Inventory sales order.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list when organization_id is not supplied, then creates a sales order via the provider.
 * @pitfalls: New orders are created in "draft" status and the fulfillment "status" can diverge from the workflow "order_status"; omitting "date" defaults it to today, and unset "shipment_date"/"reference_number" are returned as empty strings rather than omitted.
 */
const action = createAction({
    description: 'Create a new sales order for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            const organizationsResponse = await nango.get<unknown>({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });

            const organizations = ProviderOrganizationsResponseSchema.parse(organizationsResponse.data);
            const firstOrganization = organizations.organizations?.[0];

            if (!firstOrganization) {
                throw new nango.ActionError({
                    type: 'organization_not_found',
                    message: 'No Zoho Inventory organization is available for this connection.'
                });
            }

            organizationId = firstOrganization.organization_id;
        }

        const lineItems = input.line_items.map((item) => ({
            item_id: item.item_id,
            quantity: item.quantity,
            ...(item.rate !== undefined && { rate: item.rate }),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.unit !== undefined && { unit: item.unit }),
            ...(item.discount !== undefined && { discount: item.discount }),
            ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
            ...(item.location_id !== undefined && { location_id: item.location_id })
        }));

        const data = {
            customer_id: input.customer_id,
            line_items: lineItems,
            ...(input.salesorder_number !== undefined && { salesorder_number: input.salesorder_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.shipment_date !== undefined && { shipment_date: input.shipment_date }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.location_id !== undefined && { location_id: input.location_id })
        };

        // Creating a sales order is not idempotent: a retry after a lost response would create a duplicate order.
        // https://www.zoho.com/inventory/api/v1/salesorders/#create-a-sales-order
        const response = await nango.post<unknown>({
            endpoint: '/inventory/v1/salesorders',
            params: {
                organization_id: organizationId
            },
            data,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- creating a sales order is not idempotent
            retries: 0
        });

        const parsed = ProviderSalesOrderResponseSchema.parse(response.data);

        if (parsed.code !== 0 || !parsed.salesorder) {
            throw new nango.ActionError({
                type: 'create_sales_order_failed',
                message: parsed.message ?? 'Zoho Inventory did not return a sales order.',
                code: parsed.code
            });
        }

        const salesOrder = parsed.salesorder;

        return {
            salesorder_id: salesOrder.salesorder_id,
            salesorder_number: salesOrder.salesorder_number,
            date: salesOrder.date,
            ...(salesOrder.status !== undefined && { status: salesOrder.status }),
            ...(salesOrder.order_status !== undefined && { order_status: salesOrder.order_status }),
            ...(salesOrder.shipment_date !== undefined && { shipment_date: salesOrder.shipment_date }),
            ...(salesOrder.reference_number !== undefined && { reference_number: salesOrder.reference_number }),
            customer_id: salesOrder.customer_id,
            ...(salesOrder.customer_name !== undefined && { customer_name: salesOrder.customer_name }),
            ...(salesOrder.currency_code !== undefined && { currency_code: salesOrder.currency_code }),
            ...(salesOrder.sub_total !== undefined && { sub_total: salesOrder.sub_total }),
            ...(salesOrder.tax_total !== undefined && { tax_total: salesOrder.tax_total }),
            ...(salesOrder.total !== undefined && { total: salesOrder.total }),
            ...(salesOrder.total_quantity !== undefined && { total_quantity: salesOrder.total_quantity }),
            ...(salesOrder.is_inclusive_tax !== undefined && { is_inclusive_tax: salesOrder.is_inclusive_tax }),
            ...(salesOrder.created_time !== undefined && { created_time: salesOrder.created_time }),
            ...(salesOrder.last_modified_time !== undefined && { last_modified_time: salesOrder.last_modified_time }),
            line_items: (salesOrder.line_items ?? []).map((item) => ({
                line_item_id: item.line_item_id,
                item_id: item.item_id,
                ...(item.name !== undefined && { name: item.name }),
                ...(item.quantity !== undefined && { quantity: item.quantity }),
                ...(item.rate !== undefined && { rate: item.rate }),
                ...(item.item_total !== undefined && { item_total: item.item_total }),
                ...(item.unit !== undefined && { unit: item.unit })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
