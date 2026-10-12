import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const PurchaseOrderSchema = z.object({
    purchaseorder_id: z.string().nullable().optional().describe('Unique identifier of the purchase order. Example: "260815000000107032".'),
    purchaseorder_number: z.string().nullable().optional().describe('Display number of the purchase order. Example: "PO-00006".'),
    vendor_id: z.string().nullable().optional().describe('Identifier of the vendor the purchase order is issued to.'),
    vendor_name: z.string().nullable().optional().describe('Name of the vendor the purchase order is issued to.'),
    company_name: z.string().nullable().optional().describe('Company name associated with the vendor, if any.'),
    order_status: z.string().nullable().optional().describe('Workflow status of the purchase order. Example: "draft", "issued", "cancelled".'),
    billed_status: z.string().nullable().optional().describe('Billing status of the purchase order. Example: "to_be_billed".'),
    received_status: z.string().nullable().optional().describe('Receipt status of the purchase order. Example: "to_be_received".'),
    status: z.string().nullable().optional().describe('Fulfillment/receipt rollup status, which can disagree with order_status. Example: "draft".'),
    current_sub_status: z.string().nullable().optional().describe('Current workflow sub-status label. Example: "draft".'),
    current_sub_status_id: z.string().nullable().optional().describe('Identifier of the current workflow sub-status.'),
    color_code: z.string().nullable().optional().describe('Color code used to highlight the purchase order.'),
    reference_number: z.string().nullable().optional().describe('Reference number provided to the vendor, if any.'),
    date: z.string().nullable().optional().describe('Purchase order date in yyyy-MM-dd format.'),
    delivery_date: z.string().nullable().optional().describe('Delivery date in yyyy-MM-dd format, if set.'),
    expected_delivery_date: z.string().nullable().optional().describe('Expected delivery date in yyyy-MM-dd format, if set.'),
    delivery_days: z.string().nullable().optional().describe('Number of days allowed for delivery.'),
    due_by_days: z.string().nullable().optional().describe('Number of days until the purchase order is due.'),
    due_in_days: z.string().nullable().optional().describe('Number of days remaining until the purchase order is due.'),
    currency_id: z.string().nullable().optional().describe('Identifier of the purchase order currency.'),
    currency_code: z.string().nullable().optional().describe('ISO code of the purchase order currency. Example: "USD".'),
    price_precision: z.string().nullable().optional().describe('Decimal precision applied to the purchase order prices.'),
    total: z.number().nullable().optional().describe('Total amount of the purchase order.'),
    has_attachment: z.boolean().nullable().optional().describe('Whether the purchase order has any attachments.'),
    tags: z.array(z.unknown()).nullable().optional().describe('Tags attached to the purchase order.'),
    created_time: z.string().nullable().optional().describe('Creation timestamp. Example: "2026-06-09T13:38:49-0400".'),
    last_modified_time: z.string().nullable().optional().describe('Last modification timestamp. Example: "2026-06-09T13:38:49-0400".'),
    is_drop_shipment: z.boolean().nullable().optional().describe('Whether the purchase order is a drop shipment.'),
    total_ordered_quantity: z.number().nullable().optional().describe('Total quantity of the purchase order line items.'),
    quantity_yet_to_receive: z.number().nullable().optional().describe('Quantity of items still to be received.'),
    quantity_marked_as_received: z.number().nullable().optional().describe('Quantity of items marked as received.'),
    is_po_marked_as_received: z.boolean().nullable().optional().describe('Whether the purchase order is marked as fully received.'),
    is_backorder: z.boolean().nullable().optional().describe('Whether the purchase order is a backorder.'),
    receives: z.array(z.unknown()).nullable().optional().describe('Purchase receive transactions recorded against the purchase order.'),
    client_viewed_time: z.string().nullable().optional().describe('Timestamp the client last viewed the purchase order, if any.'),
    is_viewed_by_client: z.boolean().nullable().optional().describe('Whether the client has viewed the purchase order.')
});

const PageContextSchema = z.object({
    page: z.number().describe('Current page number.'),
    per_page: z.number().describe('Number of records requested per page.'),
    has_more_page: z.boolean().describe('Whether further pages of purchase orders are available.')
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        page: z.number().int().positive().optional().describe('Page number to fetch. Defaults to 1.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of purchase orders to fetch per page, up to 200. Defaults to 200.')
    })
    .describe('Filters for listing purchase orders issued to vendors.');

const OutputSchema = z
    .object({
        purchaseorders: z.array(PurchaseOrderSchema).describe('Purchase orders issued to vendors.'),
        page_context: PageContextSchema.describe('Pagination metadata for the returned page of purchase orders.'),
        next_page: z.number().optional().describe('Page number to request next, present only when more purchase orders are available.')
    })
    .describe('A page of purchase orders issued to vendors.');

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ResponseSchema = ProviderEnvelopeSchema.extend({
    purchaseorders: z.array(PurchaseOrderSchema),
    page_context: PageContextSchema
});

/**
 * @tags: [read]
 * @tagReason: Lists purchase orders from Zoho Inventory without mutating any provider data.
 * @pitfalls: `status` is a fulfillment/receipt rollup that can disagree with the workflow `order_status`/`current_sub_status`, so do not treat `status` alone as the purchase order's workflow state.
 */
const action = createAction({
    description: 'List purchase orders issued to vendors.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.get<unknown>({
            // https://www.zoho.com/inventory/api/v1/purchaseorders/#list-all-purchaseorders
            endpoint: '/inventory/v1/purchaseorders',
            params: {
                organization_id: organizationId,
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when listing purchase orders.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: envelope.data.message, code: envelope.data.code });
        }

        const result = ResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected purchase orders payload from Zoho Inventory API.',
                details: result.error.message
            });
        }

        const parsed = result.data;
        const hasMorePage = parsed.page_context.has_more_page;

        return {
            purchaseorders: parsed.purchaseorders,
            page_context: parsed.page_context,
            ...(hasMorePage && { next_page: parsed.page_context.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
