import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';

const SALES_ORDERS_PAGE_LIMIT = 200;

const SalesOrderSchema = z
    .object({
        id: z.string().describe("Stable sales order id (the provider's salesorder_id). Example: 260815000000159303"),
        salesorder_number: z.string().optional().describe('Human-readable sales order number, unique within the organization. Example: SO-00020'),
        reference_number: z.string().optional().describe('Free-text reference number supplied for the sales order. Example: REF-S-00020'),
        date: z.string().optional().describe('Sales order date in yyyy-MM-dd format. Example: 2026-10-09'),
        shipment_date: z.string().optional().describe('Planned or actual shipment date in yyyy-MM-dd format, when set.'),
        delivery_date: z.string().optional().describe('Requested delivery date in yyyy-MM-dd format, when set.'),
        customer_id: z.string().optional().describe('Identifier of the customer (contact) the sales order belongs to. Example: 260815000000160186'),
        customer_name: z.string().optional().describe('Name of the customer the sales order belongs to. Example: Acme Corp'),
        company_name: z.string().optional().describe('Company name recorded on the sales order, when different from customer_name.'),
        email: z.string().optional().describe('Email address recorded on the sales order.'),
        status: z
            .string()
            .optional()
            .describe(
                'Top-level fulfillment/receipt rollup status, e.g. draft, open, fulfilled, void. This is a separate field from order_status and the two can disagree.'
            ),
        order_status: z.string().optional().describe('Workflow status of the order itself, e.g. draft, open, confirmed, void.'),
        current_sub_status: z.string().optional().describe('Current workflow sub-status when a multi-step workflow applies.'),
        current_sub_status_id: z.string().optional().describe('Identifier of the current workflow sub-status, when set.'),
        invoiced_status: z.string().optional().describe("Invoicing rollup, e.g. 'invoiced', 'partially_invoiced', or empty when nothing is invoiced."),
        paid_status: z.string().optional().describe("Payment rollup, e.g. 'paid', 'partially_paid', or empty when nothing is paid."),
        shipped_status: z.string().optional().describe("Shipment rollup, e.g. 'shipped', 'partially_shipped', or empty when nothing is shipped."),
        order_fulfillment_type: z.string().optional().describe("How the order is fulfilled, e.g. 'manually' or 'drop_shipment', when set."),
        currency_id: z.string().optional().describe('Identifier of the transaction currency. Example: 260815000000000097'),
        currency_code: z.string().optional().describe('ISO 4217 code of the transaction currency. Example: USD'),
        total: z.number().optional().describe('Total amount of the sales order in the transaction currency. Example: 150'),
        bcy_total: z.number().optional().describe('Total amount of the sales order converted to the organization base currency.'),
        total_invoiced_amount: z.number().optional().describe('Amount already invoiced against this sales order.'),
        balance: z.number().optional().describe('Outstanding balance remaining on the sales order.'),
        quantity: z.number().optional().describe('Total quantity across all line items.'),
        quantity_invoiced: z.number().optional().describe('Quantity of the line items already invoiced.'),
        quantity_packed: z.number().optional().describe('Quantity of the line items already packed.'),
        quantity_shipped: z.number().optional().describe('Quantity of the line items already shipped.'),
        sales_channel: z.string().optional().describe("Channel the order was obtained through, e.g. 'direct_sales'. Example: direct_sales"),
        sales_channel_formatted: z.string().optional().describe('Display form of the sales channel. Example: Direct Sales'),
        salesperson_name: z.string().optional().describe('Name of the salesperson associated with the order, when set.'),
        source: z.string().optional().describe("How the order was created, e.g. 'Api' or 'Manual'. Example: Api"),
        color_code: z.string().optional().describe('Custom color highlight applied to the order in the Zoho UI, when set.'),
        delivery_method: z.string().optional().describe('Delivery method recorded on the order, when set.'),
        delivery_method_id: z.string().optional().describe('Identifier of the delivery method, when set.'),
        pickup_location_id: z.string().optional().describe('Identifier of the pickup location for the order, when set.'),
        shipment_days: z.string().optional().describe('Number of days allowed for shipment, as returned by the list endpoint. Example: 2. Empty when unset.'),
        due_by_days: z.string().optional().describe('Number of days until the order is due, as returned by the list endpoint. Empty when unset.'),
        due_in_days: z.string().optional().describe('Number of days remaining until the order is due, as returned by the list endpoint. Empty when unset.'),
        zcrm_potential_id: z.string().optional().describe('Identifier of the linked Zoho CRM deal, when the order originated from CRM.'),
        zcrm_potential_name: z.string().optional().describe('Name of the linked Zoho CRM deal, when the order originated from CRM.'),
        is_emailed: z.boolean().optional().describe('Whether the sales order has been emailed to the customer.'),
        is_drop_shipment: z.boolean().optional().describe('Whether the sales order is a drop shipment.'),
        is_backorder: z.boolean().optional().describe('Whether the sales order is a backorder.'),
        is_manually_fulfilled: z.boolean().optional().describe('Whether the order is fulfilled manually rather than through inventory.'),
        has_attachment: z.boolean().optional().describe('Whether the sales order has one or more attachments.'),
        is_viewed_in_mail: z.boolean().optional().describe('Whether the emailed order has been viewed by the recipient.'),
        mail_first_viewed_time: z.string().optional().describe('Timestamp of the first time the emailed order was viewed by the recipient, when known.'),
        mail_last_viewed_time: z.string().optional().describe('Timestamp of the most recent time the emailed order was viewed by the recipient, when known.'),
        is_scheduled_for_quick_shipment_create: z.boolean().optional().describe('Whether the order is scheduled for quick shipment creation.'),
        created_time: z
            .string()
            .optional()
            .describe('Creation timestamp in Zoho offset format, e.g. 2026-10-09T14:28:36-0400. Example: 2026-10-09T14:28:36-0400'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Last modification timestamp in Zoho offset format, e.g. 2026-10-09T14:28:36-0400. Example: 2026-10-09T14:28:36-0400'),
        tags: z.array(z.unknown()).optional().describe('Tags attached to the sales order in the Zoho UI; each entry is the provider tag shape.')
    })
    .describe('A Zoho Inventory sales order as returned by the list sales orders endpoint.');

const RawSalesOrderSchema = z.object({
    salesorder_id: z.string(),
    salesorder_number: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    shipment_date: z.string().optional().nullable(),
    delivery_date: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    customer_name: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    order_status: z.string().optional().nullable(),
    current_sub_status: z.string().optional().nullable(),
    current_sub_status_id: z.string().optional().nullable(),
    invoiced_status: z.string().optional().nullable(),
    paid_status: z.string().optional().nullable(),
    shipped_status: z.string().optional().nullable(),
    order_fulfillment_type: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    total: z.number().optional().nullable(),
    bcy_total: z.number().optional().nullable(),
    total_invoiced_amount: z.number().optional().nullable(),
    balance: z.number().optional().nullable(),
    quantity: z.number().optional().nullable(),
    quantity_invoiced: z.number().optional().nullable(),
    quantity_packed: z.number().optional().nullable(),
    quantity_shipped: z.number().optional().nullable(),
    sales_channel: z.string().optional().nullable(),
    sales_channel_formatted: z.string().optional().nullable(),
    salesperson_name: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    color_code: z.string().optional().nullable(),
    delivery_method: z.string().optional().nullable(),
    delivery_method_id: z.string().optional().nullable(),
    pickup_location_id: z.string().optional().nullable(),
    shipment_days: z.string().optional().nullable(),
    due_by_days: z.string().optional().nullable(),
    due_in_days: z.string().optional().nullable(),
    zcrm_potential_id: z.string().optional().nullable(),
    zcrm_potential_name: z.string().optional().nullable(),
    is_emailed: z.boolean().optional().nullable(),
    is_drop_shipment: z.boolean().optional().nullable(),
    is_backorder: z.boolean().optional().nullable(),
    is_manually_fulfilled: z.boolean().optional().nullable(),
    has_attachment: z.boolean().optional().nullable(),
    is_viewed_in_mail: z.boolean().optional().nullable(),
    mail_first_viewed_time: z.string().optional().nullable(),
    mail_last_viewed_time: z.string().optional().nullable(),
    is_scheduled_for_quick_shipment_create: z.boolean().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable(),
    tags: z.array(z.unknown()).optional().nullable()
});

const CheckpointSchema = z
    .object({
        page: z.number().int().positive().describe('Next page to request when resuming an interrupted full refresh.')
    })
    .describe('Checkpoint storing the next sales orders page to request during a full refresh.');

const sync = createSync({
    description: 'Sync all sales orders in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.salesorders.READ', 'ZohoInventory.settings.READ'],
    models: {
        SalesOrder: SalesOrderSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // Offset pages shift left when records on already-synced pages are deleted between an
        // interrupted run and its resume, so resume one page early: re-saving a page is harmless,
        // while a skipped record would be wrongly removed by trackDeletesEnd.
        let nextPage: number | undefined = checkpoint ? Math.max(1, checkpoint.page - 1) : 1;

        // Blocker: GET /inventory/v1/salesorders has no changed-since filter and no
        // deleted-record endpoint, so this remains a full refresh. The page/per_page
        // pagination is checkpointed so interrupted runs resume from the next page,
        // while deletion detection still closes only after the full scan succeeds.
        await nango.trackDeletesStart('SalesOrder');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/salesorders/#list-all-sales-orders
            endpoint: '/inventory/v1/salesorders',
            params: {
                organization_id: organizationId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: SALES_ORDERS_PAGE_LIMIT,
                response_path: 'salesorders',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            // Throw on parse failure: silently skipping a malformed record inside a
            // delete-tracked scan would cause it to be falsely marked as deleted.
            const parsedPage = z.array(RawSalesOrderSchema).parse(page);

            const salesOrders = parsedPage.map((record) => ({
                id: record.salesorder_id,
                ...(record.salesorder_number != null && { salesorder_number: record.salesorder_number }),
                ...(record.reference_number != null && { reference_number: record.reference_number }),
                ...(record.date != null && { date: record.date }),
                ...(record.shipment_date != null && { shipment_date: record.shipment_date }),
                ...(record.delivery_date != null && { delivery_date: record.delivery_date }),
                ...(record.customer_id != null && { customer_id: record.customer_id }),
                ...(record.customer_name != null && { customer_name: record.customer_name }),
                ...(record.company_name != null && { company_name: record.company_name }),
                ...(record.email != null && { email: record.email }),
                ...(record.status != null && { status: record.status }),
                ...(record.order_status != null && { order_status: record.order_status }),
                ...(record.current_sub_status != null && { current_sub_status: record.current_sub_status }),
                ...(record.current_sub_status_id != null && { current_sub_status_id: record.current_sub_status_id }),
                ...(record.invoiced_status != null && { invoiced_status: record.invoiced_status }),
                ...(record.paid_status != null && { paid_status: record.paid_status }),
                ...(record.shipped_status != null && { shipped_status: record.shipped_status }),
                ...(record.order_fulfillment_type != null && { order_fulfillment_type: record.order_fulfillment_type }),
                ...(record.currency_id != null && { currency_id: record.currency_id }),
                ...(record.currency_code != null && { currency_code: record.currency_code }),
                ...(record.total != null && { total: record.total }),
                ...(record.bcy_total != null && { bcy_total: record.bcy_total }),
                ...(record.total_invoiced_amount != null && { total_invoiced_amount: record.total_invoiced_amount }),
                ...(record.balance != null && { balance: record.balance }),
                ...(record.quantity != null && { quantity: record.quantity }),
                ...(record.quantity_invoiced != null && { quantity_invoiced: record.quantity_invoiced }),
                ...(record.quantity_packed != null && { quantity_packed: record.quantity_packed }),
                ...(record.quantity_shipped != null && { quantity_shipped: record.quantity_shipped }),
                ...(record.sales_channel != null && { sales_channel: record.sales_channel }),
                ...(record.sales_channel_formatted != null && { sales_channel_formatted: record.sales_channel_formatted }),
                ...(record.salesperson_name != null && { salesperson_name: record.salesperson_name }),
                ...(record.source != null && { source: record.source }),
                ...(record.color_code != null && { color_code: record.color_code }),
                ...(record.delivery_method != null && { delivery_method: record.delivery_method }),
                ...(record.delivery_method_id != null && { delivery_method_id: record.delivery_method_id }),
                ...(record.pickup_location_id != null && { pickup_location_id: record.pickup_location_id }),
                ...(record.shipment_days != null && { shipment_days: record.shipment_days }),
                ...(record.due_by_days != null && { due_by_days: record.due_by_days }),
                ...(record.due_in_days != null && { due_in_days: record.due_in_days }),
                ...(record.zcrm_potential_id != null && { zcrm_potential_id: record.zcrm_potential_id }),
                ...(record.zcrm_potential_name != null && { zcrm_potential_name: record.zcrm_potential_name }),
                ...(record.is_emailed != null && { is_emailed: record.is_emailed }),
                ...(record.is_drop_shipment != null && { is_drop_shipment: record.is_drop_shipment }),
                ...(record.is_backorder != null && { is_backorder: record.is_backorder }),
                ...(record.is_manually_fulfilled != null && { is_manually_fulfilled: record.is_manually_fulfilled }),
                ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                ...(record.is_viewed_in_mail != null && { is_viewed_in_mail: record.is_viewed_in_mail }),
                ...(record.mail_first_viewed_time != null && { mail_first_viewed_time: record.mail_first_viewed_time }),
                ...(record.mail_last_viewed_time != null && { mail_last_viewed_time: record.mail_last_viewed_time }),
                ...(record.is_scheduled_for_quick_shipment_create != null && {
                    is_scheduled_for_quick_shipment_create: record.is_scheduled_for_quick_shipment_create
                }),
                ...(record.created_time != null && { created_time: record.created_time }),
                ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time }),
                ...(record.tags != null && { tags: record.tags })
            }));

            if (salesOrders.length > 0) {
                await nango.batchSave(salesOrders, 'SalesOrder');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SalesOrder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
