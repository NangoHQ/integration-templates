import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SalesOrderCustomFieldSchema = z.object({
    customfield_id: z.string().optional().describe('Custom field ID.'),
    label: z.string().optional().describe('Custom field label.'),
    value: z.string().optional().describe('Custom field value.')
});

const SalesOrderSchema = z
    .object({
        salesorder_id: z.string().describe('Unique sales order ID. Example: "260815000000160193"'),
        salesorder_number: z.string().describe('Sales order number. Example: "SO-00015"'),
        reference_number: z.string().optional().describe('Reference number entered for the sales order, or an empty string.'),
        date: z.string().optional().describe('Sales order date in yyyy-MM-dd format. Example: "2026-10-09"'),
        shipment_date: z.string().optional().describe('Expected shipment date in yyyy-MM-dd format, or an empty string when unset.'),
        shipment_days: z.string().optional().describe('Number of days allowed for shipment, or an empty string when unset.'),
        due_by_days: z.string().optional().describe('Number of days until the sales order is due, or an empty string when unset.'),
        due_in_days: z.string().optional().describe('Number of days remaining until due, or an empty string when unset.'),
        status: z.string().optional().describe('Fulfillment/receipt rollup status (e.g. "draft", "fulfilled"), which can differ from order_status.'),
        order_status: z.string().optional().describe('Workflow status of the sales order (e.g. "draft", "confirmed", "void").'),
        current_sub_status: z.string().optional().describe('Current workflow sub-status of the sales order (e.g. "draft").'),
        current_sub_status_id: z.string().optional().describe('ID of the current workflow sub-status, or an empty string when unset.'),
        invoiced_status: z.string().optional().describe('Invoicing status (e.g. "not_invoiced", "invoiced", "partially_invoiced"), or an empty string.'),
        paid_status: z.string().optional().describe('Payment status (e.g. "unpaid", "paid", "partially_paid"), or an empty string.'),
        shipped_status: z.string().optional().describe('Shipping status (e.g. "not_shipped", "shipped"), or an empty string.'),
        order_fulfillment_type: z.string().optional().describe('Fulfillment type of the sales order, or an empty string when unset.'),
        customer_id: z.string().optional().describe('ID of the customer contact. Example: "260815000000160186"'),
        customer_name: z.string().optional().describe('Display name of the customer contact.'),
        company_name: z.string().optional().describe('Company name of the customer, or an empty string.'),
        email: z.string().optional().describe('Customer email address, or an empty string.'),
        currency_id: z.string().optional().describe('ID of the currency used on the sales order.'),
        currency_code: z.string().optional().describe('ISO currency code. Example: "USD"'),
        source: z.string().optional().describe('Origin of the sales order (e.g. "Api", "web").'),
        total: z.number().optional().describe('Total amount of the sales order in the organization currency.'),
        bcy_total: z.number().optional().describe('Total amount of the sales order in the base currency.'),
        total_invoiced_amount: z.number().optional().describe('Total amount already invoiced from this sales order.'),
        balance: z.number().optional().describe('Outstanding balance of the sales order.'),
        quantity: z.number().optional().describe('Total quantity of items on the sales order.'),
        quantity_invoiced: z.number().optional().describe('Total quantity already invoiced.'),
        quantity_packed: z.number().optional().describe('Total quantity already packed.'),
        quantity_shipped: z.number().optional().describe('Total quantity already shipped.'),
        is_emailed: z.boolean().optional().describe('Whether the sales order has been emailed to the customer.'),
        is_drop_shipment: z.boolean().optional().describe('Whether the sales order is a drop shipment.'),
        is_backorder: z.boolean().optional().describe('Whether the sales order is a backorder.'),
        is_manually_fulfilled: z.boolean().optional().describe('Whether the sales order is fulfilled manually.'),
        is_viewed_in_mail: z.boolean().optional().describe('Whether the sales order email has been viewed by the customer.'),
        is_scheduled_for_quick_shipment_create: z.boolean().optional().describe('Whether the sales order is scheduled for quick shipment creation.'),
        has_attachment: z.boolean().optional().describe('Whether the sales order has attachments.'),
        mail_first_viewed_time: z.string().optional().describe('Timestamp when the sales order email was first viewed, or an empty string.'),
        mail_last_viewed_time: z.string().optional().describe('Timestamp when the sales order email was last viewed, or an empty string.'),
        sales_channel: z.string().optional().describe('Sales channel key. Example: "direct_sales"'),
        sales_channel_formatted: z.string().optional().describe('Human-readable sales channel name. Example: "Direct Sales"'),
        salesperson_name: z.string().optional().describe('Name of the salesperson, or an empty string.'),
        delivery_method: z.string().optional().describe('Delivery method name, or an empty string.'),
        delivery_method_id: z.string().optional().describe('ID of the delivery method, or an empty string.'),
        pickup_location_id: z.string().optional().describe('ID of the pickup location, or an empty string.'),
        color_code: z.string().optional().describe('Color code used to highlight the sales order, or an empty string.'),
        zcrm_potential_id: z.string().optional().describe('Linked Zoho CRM deal ID, or an empty string.'),
        zcrm_potential_name: z.string().optional().describe('Linked Zoho CRM deal name, or an empty string.'),
        created_time: z.string().optional().describe('Creation timestamp in the organization time zone. Example: "2026-10-09T14:25:47-0400"'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in the organization time zone. Example: "2026-10-09T14:25:47-0400"'),
        tags: z.array(z.unknown()).optional().describe('Tags applied to the sales order (provider-defined shape).'),
        custom_fields: z.array(SalesOrderCustomFieldSchema).optional().describe('Custom field values configured for sales orders.')
    })
    .passthrough();

const PageContextSchema = z
    .object({
        page: z.number().int().positive().describe('Current page number. Example: 1'),
        per_page: z.number().int().positive().describe('Number of records requested per page. Example: 200'),
        has_more_page: z.boolean().describe('Whether another page of sales orders is available. Example: false')
    })
    .passthrough();

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho Inventory organization. Example: "927270289"'),
        salesorder_ids: z.string().optional().describe('Comma-separated sales order IDs for a batch lookup (maximum 200). Omit to list all sales orders.'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of sales orders to return per page. Defaults to 200.')
    })
    .describe('Filters for listing sales orders in a Zoho Inventory organization.');

const SalesOrderListResponseSchema = z.object({
    salesorders: z.array(SalesOrderSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        salesorders: z.array(SalesOrderSchema).describe('Sales orders returned for the requested page.'),
        page_context: PageContextSchema.describe('Pagination metadata for the current page.'),
        next_page: z.number().int().positive().optional().describe('Page number to request next; present only when more pages are available.')
    })
    .describe('A page of sales orders from a Zoho Inventory organization, with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists existing sales orders from Zoho Inventory without modifying any provider data.
 * @pitfalls: The top-level `status` is a fulfillment/receipt rollup that can disagree with `order_status` (the workflow state), so check `order_status` to distinguish draft from confirmed orders; `salesorder_ids` is documented as required but may be omitted to list all orders and accepts at most 200 IDs per request.
 */
const action = createAction({
    description: 'List sales orders in the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.page !== undefined && (!Number.isInteger(input.page) || input.page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'page must be a positive integer.'
            });
        }

        if (input.per_page !== undefined && (!Number.isInteger(input.per_page) || input.per_page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'per_page must be a positive integer.'
            });
        }

        const page = input.page ?? 1;
        const perPage = input.per_page ?? 200;

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/salesorders/#list-all-sales-orders
            endpoint: '/inventory/v1/salesorders',
            params: {
                organization_id: input.organization_id,
                page,
                per_page: perPage,
                ...(input.salesorder_ids !== undefined && { salesorder_ids: input.salesorder_ids })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = SalesOrderListResponseSchema.parse(response.data);

        const salesorders = parsed.salesorders ?? [];
        const pageContext = parsed.page_context ?? { page, per_page: perPage, has_more_page: false };

        return {
            salesorders,
            page_context: pageContext,
            ...(pageContext.has_more_page && { next_page: pageContext.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
