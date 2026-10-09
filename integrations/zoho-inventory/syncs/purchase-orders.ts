import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';

const RawPurchaseOrderSchema = z.object({
    purchaseorder_id: z.string(),
    purchaseorder_number: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    delivery_date: z.string().optional().nullable(),
    expected_delivery_date: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    order_status: z.string().optional().nullable(),
    billed_status: z.string().optional().nullable(),
    received_status: z.string().optional().nullable(),
    current_sub_status: z.string().optional().nullable(),
    vendor_id: z.string().optional().nullable(),
    vendor_name: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    total: z.number().optional().nullable(),
    total_ordered_quantity: z.number().optional().nullable(),
    quantity_yet_to_receive: z.number().optional().nullable(),
    quantity_marked_as_received: z.number().optional().nullable(),
    is_po_marked_as_received: z.boolean().optional().nullable(),
    is_drop_shipment: z.boolean().optional().nullable(),
    is_backorder: z.boolean().optional().nullable(),
    has_attachment: z.boolean().optional().nullable(),
    client_viewed_time: z.string().optional().nullable(),
    is_viewed_by_client: z.boolean().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable()
});

const PurchaseOrderSchema = z
    .object({
        id: z.string().describe('Unique Zoho Inventory identifier of the purchase order (purchaseorder_id).'),
        purchaseorder_number: z.string().describe('Human-readable purchase order number, e.g. PO-00010.').optional(),
        reference_number: z.string().describe('Optional vendor or reference number recorded on the purchase order.').optional(),
        date: z.string().describe('Date the purchase order was raised, in YYYY-MM-DD format.').optional(),
        delivery_date: z.string().describe('Requested delivery date of the purchase order, in YYYY-MM-DD format.').optional(),
        expected_delivery_date: z.string().describe('Expected delivery date of the purchase order, in YYYY-MM-DD format.').optional(),
        status: z.string().describe('Overall purchase order status rolled up from fulfillment, e.g. draft, issued, received, cancelled.').optional(),
        order_status: z.string().describe('Workflow status of the purchase order itself, e.g. draft, issued, cancelled. Can differ from status.').optional(),
        billed_status: z.string().describe('Billing status of the purchase order, e.g. to_be_billed, billed.').optional(),
        received_status: z.string().describe('Receiving status of the purchase order, e.g. to_be_received, received.').optional(),
        current_sub_status: z.string().describe('Current custom workflow sub-status of the purchase order, when sub-statuses are configured.').optional(),
        vendor_id: z.string().describe('Unique Zoho Inventory identifier of the vendor the purchase order is issued to.').optional(),
        vendor_name: z.string().describe('Display name of the vendor the purchase order is issued to.').optional(),
        company_name: z.string().describe('Company name associated with the vendor contact, when set.').optional(),
        currency_id: z.string().describe('Unique Zoho Inventory identifier of the purchase order currency.').optional(),
        currency_code: z.string().describe('ISO currency code of the purchase order, e.g. USD.').optional(),
        total: z.number().describe('Total amount of the purchase order in the order currency.').optional(),
        total_ordered_quantity: z.number().describe('Sum of the ordered quantities across all line items.').optional(),
        quantity_yet_to_receive: z.number().describe('Quantity still outstanding to be received against the purchase order.').optional(),
        quantity_marked_as_received: z.number().describe('Quantity marked as received so far against the purchase order.').optional(),
        is_po_marked_as_received: z.boolean().describe('Whether the purchase order has been marked as fully received.').optional(),
        is_drop_shipment: z.boolean().describe('Whether the purchase order is a drop shipment.').optional(),
        is_backorder: z.boolean().describe('Whether the purchase order is a backorder.').optional(),
        has_attachment: z.boolean().describe('Whether the purchase order has an attached document.').optional(),
        client_viewed_time: z.string().describe('Timestamp when the vendor first viewed the purchase order, when applicable.').optional(),
        is_viewed_by_client: z.boolean().describe('Whether the vendor has viewed the purchase order.').optional(),
        created_time: z.string().describe('Timestamp when the purchase order was created, e.g. 2026-10-09T14:25:12-0400.').optional(),
        last_modified_time: z.string().describe('Timestamp when the purchase order was last modified, e.g. 2026-10-09T14:25:13-0400.').optional()
    })
    .describe('A purchase order issued to a vendor in Zoho Inventory.');

const CheckpointSchema = z
    .object({
        page: z.number().int().positive().describe('Next page to request when resuming an interrupted full refresh.')
    })
    .describe('Checkpoint storing the next purchase orders page to request during a full refresh.');

const sync = createSync({
    description: 'Sync all purchase orders issued to vendors.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.purchaseorders.READ', 'ZohoInventory.settings.READ'],
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // Offset pages shift left when records on already-synced pages are deleted between an
        // interrupted run and its resume, so resume one page early: re-saving a page is harmless,
        // while a skipped record would be wrongly removed by trackDeletesEnd.
        let nextPage: number | undefined = checkpoint ? Math.max(1, checkpoint.page - 1) : 1;

        // Blocker: GET /inventory/v1/purchaseorders exposes no changed-since filter and
        // Zoho Inventory has no deleted-record endpoint, so this remains a full refresh.
        // The page/per_page pagination is checkpointed so interrupted runs resume from the
        // next page, while trackDeletesStart/trackDeletesEnd still wrap the full successful scan.
        await nango.trackDeletesStart('PurchaseOrder');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/purchaseorders/#list-purchase-orders
            endpoint: '/inventory/v1/purchaseorders',
            params: {
                organization_id: organizationId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'purchaseorders',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<z.infer<typeof RawPurchaseOrderSchema>>(proxyConfig)) {
            const parsedRecords = z.array(RawPurchaseOrderSchema).safeParse(pageResults);
            if (!parsedRecords.success) {
                throw new Error(`Failed to parse purchase orders: ${parsedRecords.error.message}`);
            }

            const purchaseOrders = parsedRecords.data.map((record) => ({
                id: record.purchaseorder_id,
                ...(record.purchaseorder_number != null && { purchaseorder_number: record.purchaseorder_number }),
                ...(record.reference_number != null && { reference_number: record.reference_number }),
                ...(record.date != null && { date: record.date }),
                ...(record.delivery_date != null && { delivery_date: record.delivery_date }),
                ...(record.expected_delivery_date != null && { expected_delivery_date: record.expected_delivery_date }),
                ...(record.status != null && { status: record.status }),
                ...(record.order_status != null && { order_status: record.order_status }),
                ...(record.billed_status != null && { billed_status: record.billed_status }),
                ...(record.received_status != null && { received_status: record.received_status }),
                ...(record.current_sub_status != null && { current_sub_status: record.current_sub_status }),
                ...(record.vendor_id != null && { vendor_id: record.vendor_id }),
                ...(record.vendor_name != null && { vendor_name: record.vendor_name }),
                ...(record.company_name != null && { company_name: record.company_name }),
                ...(record.currency_id != null && { currency_id: record.currency_id }),
                ...(record.currency_code != null && { currency_code: record.currency_code }),
                ...(record.total != null && { total: record.total }),
                ...(record.total_ordered_quantity != null && { total_ordered_quantity: record.total_ordered_quantity }),
                ...(record.quantity_yet_to_receive != null && { quantity_yet_to_receive: record.quantity_yet_to_receive }),
                ...(record.quantity_marked_as_received != null && { quantity_marked_as_received: record.quantity_marked_as_received }),
                ...(record.is_po_marked_as_received != null && { is_po_marked_as_received: record.is_po_marked_as_received }),
                ...(record.is_drop_shipment != null && { is_drop_shipment: record.is_drop_shipment }),
                ...(record.is_backorder != null && { is_backorder: record.is_backorder }),
                ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                ...(record.client_viewed_time != null && { client_viewed_time: record.client_viewed_time }),
                ...(record.is_viewed_by_client != null && { is_viewed_by_client: record.is_viewed_by_client }),
                ...(record.created_time != null && { created_time: record.created_time }),
                ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time })
            }));

            if (purchaseOrders.length > 0) {
                await nango.batchSave(purchaseOrders, 'PurchaseOrder');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PurchaseOrder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
