import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const CustomFieldInputSchema = z.object({
    customfield_id: z.string().describe('Unique ID of the custom field. Example: "260815000000123456"'),
    label: z.string().optional().describe('Label of the custom field.'),
    value: z.string().describe('Value to set for the custom field.')
});

const LineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('Existing line item ID to update. Omit to add a new line item. Example: "260815000000161122"'),
    item_id: z.string().optional().describe('Item ID. Example: "260815000000101002"'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    rate: z.number().optional().describe('Rate / selling price per unit. Example: 150'),
    quantity: z.number().optional().describe('Quantity of the line item. Example: 2'),
    unit: z.string().optional().describe('Unit of measurement. Example: "hour"'),
    tax_id: z.string().optional().describe('Unique ID of the tax applied to the line item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
    tax_type: z.string().optional().describe('Type of the tax: `tax` for a single tax or `tax_group` for a group.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item. Example: 12')
});

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('ID of the sales order to update. Example: "260815000000161117"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        customer_id: z.string().describe('Unique ID of the customer for the sales order. Example: "260815000000097001"'),
        line_items: z
            .array(LineItemInputSchema)
            .min(1)
            .describe('At least one line item is required. Pass line_item_id to modify an existing line, or omit it to add a new one.'),
        salesorder_number: z.string().optional().describe('Sales order number. This is unique for each sales order.'),
        date: z.string().optional().describe('Date of the sales order. Format: YYYY-MM-DD. Example: "2026-10-09"'),
        shipment_date: z.string().optional().describe('Shipment date of the sales order. Format: YYYY-MM-DD.'),
        reference_number: z.string().optional().describe('Reference number of the sales order.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom fields associated with the sales order.'),
        notes: z.string().optional().describe('Notes for the sales order.'),
        terms: z.string().optional().describe('Terms and conditions for the sales order.'),
        discount: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Discount applied at entity level. Percentage values include the "%" symbol (e.g. "10%"); flat amounts are plain numbers.'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        discount_type: z.enum(['entity_level', 'item_level']).optional().describe('Whether the discount is applied at the entity level or per line item.'),
        delivery_method: z.string().optional().describe('Delivery method for the shipment.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the sales order total.'),
        adjustment: z.number().optional().describe('Adjustment applied to the sales order total.'),
        adjustment_description: z.string().optional().describe('Description of the adjustment.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson.'),
        exchange_rate: z.number().optional().describe('Exchange rate of the currency with respect to the base currency.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item prices are inclusive of tax.'),
        location_id: z.string().optional().describe('Location ID associated with the sales order.')
    })
    .describe('Input for updating an existing sales order in Zoho Inventory.');

const LineItemSchema = z.object({
    line_item_id: z.string().nullable().optional().describe('Unique ID of the line item.'),
    item_id: z.string().nullable().optional().describe('Unique ID of the item.'),
    name: z.string().nullable().optional().describe('Name of the line item.'),
    description: z.string().nullable().optional().describe('Description of the line item.'),
    rate: z.number().nullable().optional().describe('Rate / selling price per unit.'),
    quantity: z.number().nullable().optional().describe('Quantity of the line item.'),
    unit: z.string().nullable().optional().describe('Unit of measurement.'),
    item_total: z.number().nullable().optional().describe('Total amount of the line item.')
});

const ProviderSalesOrderSchema = z.object({
    salesorder_id: z.string(),
    salesorder_number: z.string().nullish(),
    date: z.string().nullish(),
    shipment_date: z.string().nullish(),
    reference_number: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    status: z.string().nullish(),
    order_status: z.string().nullish(),
    current_sub_status: z.string().nullish(),
    currency_code: z.string().nullish(),
    exchange_rate: z.number().nullish(),
    sub_total: z.number().nullish(),
    tax_total: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    notes: z.string().nullish(),
    terms: z.string().nullish(),
    delivery_method: z.string().nullish(),
    salesperson_name: z.string().nullish(),
    line_items: z.array(LineItemSchema).nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    salesorder: ProviderSalesOrderSchema.optional(),
    sales_order: ProviderSalesOrderSchema.optional()
});

const OutputSchema = z
    .object({
        salesorder_id: z.string().describe('Unique ID of the updated sales order. Example: "260815000000161117"'),
        salesorder_number: z.string().optional().describe('Sales order number. Example: "SO-00012"'),
        date: z.string().optional().describe('Date of the sales order. Format: YYYY-MM-DD.'),
        shipment_date: z.string().optional().describe('Shipment date of the sales order. Format: YYYY-MM-DD.'),
        reference_number: z.string().optional().describe('Reference number of the sales order.'),
        customer_id: z.string().optional().describe('Unique ID of the customer.'),
        customer_name: z.string().optional().describe('Name of the customer.'),
        status: z.string().optional().describe('Top-level status rollup (e.g. "draft", "fulfilled"); may differ from order_status.'),
        order_status: z.string().optional().describe('Sales order workflow status (e.g. "draft", "confirmed", "void").'),
        current_sub_status: z.string().optional().describe('Current sub-status of the sales order workflow.'),
        currency_code: z.string().optional().describe('Currency code of the sales order. Example: "USD"'),
        exchange_rate: z.number().optional().describe('Exchange rate of the currency with respect to the base currency.'),
        sub_total: z.number().optional().describe('Subtotal before tax and adjustments.'),
        tax_total: z.number().optional().describe('Total tax applied to the sales order.'),
        total: z.number().optional().describe('Total amount of the sales order after discounts, tax and adjustments.'),
        balance: z.number().optional().describe('Outstanding balance due on the sales order.'),
        notes: z.string().optional().describe('Notes for the sales order.'),
        terms: z.string().optional().describe('Terms and conditions for the sales order.'),
        delivery_method: z.string().optional().describe('Delivery method for the shipment.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items on the sales order.')
    })
    .describe('The updated sales order returned by Zoho Inventory.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing sales order's fields and line items through the provider's update endpoint.
 * @pitfalls: Order-level fields update partially (only what you pass changes), but customer_id and line_items are always required, so resend the full set of line items you want the order to have and pass line_item_id for lines you are modifying; the returned status can disagree with order_status because status reflects fulfillment while order_status reflects the workflow state.
 */
const action = createAction({
    description: 'Update an existing sales order in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.UPDATE'],

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

        const lineItems = input.line_items.map((item) => ({
            ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
            ...(item.item_id !== undefined && { item_id: item.item_id }),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.rate !== undefined && { rate: item.rate }),
            ...(item.quantity !== undefined && { quantity: item.quantity }),
            ...(item.unit !== undefined && { unit: item.unit }),
            ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
            ...(item.tax_name !== undefined && { tax_name: item.tax_name }),
            ...(item.tax_type !== undefined && { tax_type: item.tax_type }),
            ...(item.tax_percentage !== undefined && { tax_percentage: item.tax_percentage })
        }));

        const requestBody: Record<string, unknown> = {
            customer_id: input.customer_id,
            line_items: lineItems,
            ...(input.salesorder_number !== undefined && { salesorder_number: input.salesorder_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.shipment_date !== undefined && { shipment_date: input.shipment_date }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
            ...(input.delivery_method !== undefined && { delivery_method: input.delivery_method }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.salesperson_name !== undefined && { salesperson_name: input.salesperson_name }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.location_id !== undefined && { location_id: input.location_id })
        };

        // https://www.zoho.com/inventory/api/v1/salesorders/#update-a-sales-order
        const response = await nango.put({
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}`,
            params: {
                organization_id: organizationId
            },
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Failed to update sales order.',
                code: providerResponse.code
            });
        }

        const salesOrder = providerResponse.salesorder ?? providerResponse.sales_order;

        if (!salesOrder) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Sales order data missing from provider response.'
            });
        }

        return {
            salesorder_id: salesOrder.salesorder_id,
            ...(salesOrder.salesorder_number != null && { salesorder_number: salesOrder.salesorder_number }),
            ...(salesOrder.date != null && { date: salesOrder.date }),
            ...(salesOrder.shipment_date != null && { shipment_date: salesOrder.shipment_date }),
            ...(salesOrder.reference_number != null && { reference_number: salesOrder.reference_number }),
            ...(salesOrder.customer_id != null && { customer_id: salesOrder.customer_id }),
            ...(salesOrder.customer_name != null && { customer_name: salesOrder.customer_name }),
            ...(salesOrder.status != null && { status: salesOrder.status }),
            ...(salesOrder.order_status != null && { order_status: salesOrder.order_status }),
            ...(salesOrder.current_sub_status != null && { current_sub_status: salesOrder.current_sub_status }),
            ...(salesOrder.currency_code != null && { currency_code: salesOrder.currency_code }),
            ...(salesOrder.exchange_rate != null && { exchange_rate: salesOrder.exchange_rate }),
            ...(salesOrder.sub_total != null && { sub_total: salesOrder.sub_total }),
            ...(salesOrder.tax_total != null && { tax_total: salesOrder.tax_total }),
            ...(salesOrder.total != null && { total: salesOrder.total }),
            ...(salesOrder.balance != null && { balance: salesOrder.balance }),
            ...(salesOrder.notes != null && { notes: salesOrder.notes }),
            ...(salesOrder.terms != null && { terms: salesOrder.terms }),
            ...(salesOrder.delivery_method != null && { delivery_method: salesOrder.delivery_method }),
            ...(salesOrder.salesperson_name != null && { salesperson_name: salesOrder.salesperson_name }),
            ...(salesOrder.line_items != null && {
                line_items: salesOrder.line_items.map((item) => ({
                    ...(item.line_item_id != null && { line_item_id: item.line_item_id }),
                    ...(item.item_id != null && { item_id: item.item_id }),
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
