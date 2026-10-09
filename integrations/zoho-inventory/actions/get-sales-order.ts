import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('Unique ID of the sales order to retrieve. Example: "260815000000161134"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving a single Zoho Inventory sales order.');

const ApiResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    salesorder: z.record(z.string(), z.unknown()).optional()
});

const AddressSchema = z
    .object({
        address: z.string().optional().describe('Street address line 1.'),
        street2: z.string().optional().describe('Street address line 2.'),
        city: z.string().optional().describe('City name.'),
        state: z.string().optional().describe('State or province name.'),
        zip: z.union([z.string(), z.number()]).optional().describe('Postal or ZIP code.'),
        country: z.string().optional().describe('Country name.'),
        phone: z.string().optional().describe('Phone number associated with the address.'),
        fax: z.string().optional().describe('Fax number associated with the address.'),
        attention: z.string().optional().describe('Attention line for the address.')
    })
    .passthrough()
    .describe('A billing or shipping address on the sales order.');

const LineItemSchema = z
    .object({
        line_item_id: z.string().optional().describe('Unique ID of the line item.'),
        item_id: z.string().optional().describe('Unique ID of the inventory item.'),
        name: z.string().optional().describe('Item name.'),
        description: z.string().optional().describe('Item description.'),
        sku: z.string().optional().describe('Stock keeping unit code.'),
        quantity: z.number().optional().describe('Quantity ordered.'),
        rate: z.number().optional().describe('Unit rate applied to the line item.'),
        unit: z.string().optional().describe('Unit of measurement for the quantity.'),
        discount_amount: z.number().optional().describe('Discount amount applied to the line item.'),
        tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
        tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.'),
        item_total: z.number().optional().describe('Line item total including tax.'),
        item_sub_total: z.number().optional().describe('Line item subtotal before tax.'),
        is_invoiced: z.boolean().optional().describe('Whether the line item has been invoiced.'),
        quantity_invoiced: z.number().optional().describe('Quantity invoiced so far.'),
        quantity_packed: z.number().optional().describe('Quantity packed so far.'),
        quantity_shipped: z.number().optional().describe('Quantity shipped so far.'),
        quantity_delivered: z.number().optional().describe('Quantity delivered so far.'),
        quantity_cancelled: z.number().optional().describe('Quantity cancelled so far.')
    })
    .passthrough()
    .describe('A line item on the sales order.');

const PackageSchema = z
    .object({
        package_id: z.string().optional().describe('Unique ID of the package.'),
        package_number: z.string().optional().describe('Human-readable package number. Example: "PK-00004"'),
        status: z.string().optional().describe('Package fulfillment status.'),
        detailed_status: z.string().optional().describe('Detailed package status.'),
        status_message: z.string().optional().describe('Human-readable status message for the package.'),
        shipment_id: z.string().optional().describe('Unique ID of the shipment that contains the package.'),
        shipment_number: z.string().optional().describe('Human-readable shipment number. Example: "SH-00004"'),
        shipment_status: z.union([z.string(), z.number()]).optional().describe('Shipment status code for the package.'),
        carrier: z.string().optional().describe('Shipping carrier for the package.'),
        service: z.string().optional().describe('Carrier service used for the package.'),
        tracking_number: z.string().optional().describe('Carrier tracking number for the package.'),
        shipment_date: z.string().optional().describe('Shipment date in yyyy-MM-dd format.'),
        delivery_days: z.number().optional().describe('Estimated number of delivery days.'),
        delivery_guarantee: z.boolean().optional().describe('Whether delivery is guaranteed by the carrier.')
    })
    .passthrough()
    .describe('A package created for the sales order.');

const InvoiceRefSchema = z
    .object({
        invoice_id: z.string().optional().describe('Unique ID of the invoice generated from the order.'),
        invoice_number: z.string().optional().describe('Human-readable invoice number. Example: "INV-00001"'),
        status: z.string().optional().describe('Status of the invoice.'),
        date: z.string().optional().describe('Invoice date in yyyy-MM-dd format.'),
        due_date: z.string().optional().describe('Invoice due date in yyyy-MM-dd format.'),
        total: z.number().optional().describe('Invoice total amount.'),
        balance: z.number().optional().describe('Outstanding balance on the invoice.')
    })
    .passthrough()
    .describe('An invoice generated from the sales order.');

const SalesOrderSchema = z
    .object({
        salesorder_id: z.string().describe('Unique ID of the sales order. Example: "260815000000161134"'),
        salesorder_number: z.string().optional().describe('Human-readable sales order number. Example: "SO-00014"'),
        date: z.string().optional().describe('Sales order date in yyyy-MM-dd format.'),
        shipment_date: z.string().optional().describe('Expected shipment date in yyyy-MM-dd format, or empty when unset.'),
        reference_number: z.string().optional().describe('Optional customer reference number for the order.'),
        status: z
            .string()
            .optional()
            .describe(
                'Fulfillment rollup status (e.g. "draft", "confirmed", "fulfilled", "void"). This is separate from order_status and can disagree with it.'
            ),
        order_status: z
            .string()
            .optional()
            .describe('Workflow status of the order (e.g. "draft", "confirmed", "void"). Use this to tell whether the order is confirmed.'),
        current_sub_status: z.string().optional().describe('Current approval or custom sub-status of the order, or empty when none applies.'),
        invoiced_status: z.string().optional().describe('Invoice rollup status (e.g. "not_invoiced", "invoiced", "partially_invoiced").'),
        paid_status: z.string().optional().describe('Payment rollup status (e.g. "unpaid", "paid", "partially_paid").'),
        shipped_status: z.string().optional().describe('Shipment rollup status (e.g. "pending", "shipped", "partially_shipped").'),
        customer_id: z.string().optional().describe('Unique ID of the customer contact.'),
        customer_name: z.string().optional().describe('Display name of the customer contact.'),
        currency_code: z.string().optional().describe('ISO currency code of the order. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol used for formatting amounts. Example: "$"'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the order currency.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax, shipping and adjustments.'),
        discount_total: z.number().optional().describe('Total discount applied to the order.'),
        tax_total: z.number().optional().describe('Total tax amount for the order.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the order.'),
        adjustment: z.number().optional().describe('Manual adjustment amount applied to the order total.'),
        total: z.number().optional().describe('Grand total of the order.'),
        balance: z.number().optional().describe('Outstanding balance still due on the order.'),
        notes: z.string().optional().describe('Free-form notes attached to the order.'),
        terms: z.string().optional().describe('Terms and conditions attached to the order.'),
        salesperson_id: z.string().optional().describe('Unique ID of the assigned salesperson, or empty when unset.'),
        salesperson_name: z.string().optional().describe('Name of the assigned salesperson, or empty when unset.'),
        is_emailed: z.boolean().optional().describe('Whether the sales order has been emailed to the customer.'),
        created_time: z.string().optional().describe('Creation timestamp returned by Zoho. Example: "2026-10-09T14:25:33-0400"'),
        last_modified_time: z.string().optional().describe('Last modification timestamp returned by Zoho. Example: "2026-10-09T14:28:45-0400"'),
        line_items: z.array(LineItemSchema).optional().describe('Line items on the sales order.'),
        packages: z.array(PackageSchema).optional().describe('Packages created for the sales order.'),
        invoices: z.array(InvoiceRefSchema).optional().describe('Invoices generated from the sales order.'),
        billing_address: AddressSchema.optional().describe('Billing address of the order.'),
        shipping_address: AddressSchema.optional().describe('Shipping address of the order.')
    })
    .passthrough()
    .describe('A Zoho Inventory sales order with line items, status rollups, packages and invoices.');

const OutputSchema = SalesOrderSchema;

/**
 * @tags: [read]
 * @tagReason: Retrieves a single sales order (and discovers the organization when needed) from Zoho Inventory without modifying any provider data.
 * @pitfalls: status is a fulfillment rollup that can read "fulfilled" while order_status/current_sub_status read "confirmed", and invoiced_status/paid_status/shipped_status come back as empty strings on draft orders, so use order_status to detect confirmation.
 */
const action = createAction({
    description: 'Retrieve a single sales order from Zoho Inventory, including line items and status rollups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
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

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/salesorders/#retrieve-a-sales-order
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Zoho Inventory API.'
            });
        }

        const parsed = ApiResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        if (!parsed.salesorder) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a sales order object.'
            });
        }

        const salesOrder = SalesOrderSchema.parse(parsed.salesorder);
        return salesOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
