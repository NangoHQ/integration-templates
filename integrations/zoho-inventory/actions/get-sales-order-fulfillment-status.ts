import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('Unique ID of the Zoho Inventory sales order to inspect. Example: "1234567890"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving a consolidated fulfillment, invoicing, and payment rollup for one sales order.');

const PackageSchema = z.object({}).passthrough();

const SalesOrderInvoiceRefSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    balance: z.number().nullable().optional()
});

const ProviderSalesOrderSchema = z.object({
    salesorder_id: z.string(),
    salesorder_number: z.string().nullable().optional(),
    order_status: z.string().nullable().optional(),
    current_sub_status: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    invoiced_status: z.string().nullable().optional(),
    paid_status: z.string().nullable().optional(),
    shipped_status: z.string().nullable().optional(),
    packages: z.array(PackageSchema).nullable().optional(),
    invoices: z.array(SalesOrderInvoiceRefSchema).nullable().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    balance: z.number().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    salesorder_id: z.string().nullable().optional()
});

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const EnrichedInvoiceSchema = z.object({
    invoice_id: z.string().describe('Unique ID of the invoice.'),
    invoice_number: z.string().optional().describe('Human-readable invoice number. Example: "INV-000041"'),
    status: z.string().optional().describe('Invoice status. Example: "draft", "sent", "paid", "void", "partially_paid"'),
    date: z.string().optional().describe('Invoice date in yyyy-MM-dd format.'),
    due_date: z.string().optional().describe('Invoice due date in yyyy-MM-dd format.'),
    total: z.number().optional().describe('Total invoice amount.'),
    balance: z.number().optional().describe('Outstanding balance still due on the invoice.'),
    customer_id: z.string().optional().describe('Unique ID of the customer the invoice belongs to.'),
    customer_name: z.string().optional().describe('Name of the customer the invoice belongs to.'),
    salesorder_id: z.string().optional().describe('Sales order ID linked to the invoice, empty when the invoice is not linked to a sales order.')
});

const OutputSchema = z
    .object({
        found: z.boolean().describe('Whether the sales order exists. When false, all other fields are omitted.'),
        salesorder_id: z.string().optional().describe('Unique ID of the sales order.'),
        salesorder_number: z.string().optional().describe('Human-readable sales order number. Example: "SO-00011"'),
        order_status: z.string().optional().describe('Workflow status of the sales order. Example: "draft", "confirmed", "void"'),
        current_sub_status: z.string().optional().describe('Current sub-status of the sales order workflow. Example: "draft", "confirmed"'),
        status: z.string().optional().describe('Fulfillment-oriented rollup status, which can diverge from order_status. Example: "draft", "fulfilled"'),
        invoiced_status: z
            .string()
            .optional()
            .describe('Invoicing rollup status of the sales order. Example: "not_invoiced", "invoiced", "partially_invoiced"'),
        paid_status: z.string().optional().describe('Payment rollup status of the sales order. Example: "unpaid", "paid", "partially_paid"'),
        shipped_status: z.string().optional().describe('Shipping rollup status of the sales order. Example: "fulfilled", "partially_shipped"'),
        packages: z.array(PackageSchema).optional().describe('Packages (shipments) Zoho linked to the sales order, passed through unchanged.'),
        invoices: z
            .array(EnrichedInvoiceSchema)
            .optional()
            .describe('Invoices Zoho linked to the sales order, each enriched with its full live detail. Empty when none are linked.')
    })
    .describe('Consolidated fulfillment, invoicing, and payment rollup for a single sales order.');

/**
 * @tags: [read]
 * @tagReason: Reads the sales order, its linked invoices, and (when needed) the organization list from Zoho Inventory; performs no provider mutations.
 * @pitfalls: The top-level status is a fulfillment rollup that can diverge from the workflow order_status/current_sub_status, and rollup fields like invoiced_status may come back as empty strings rather than being omitted; the invoices array lists only invoices Zoho linked to the order, so an empty array does not guarantee there are none; omitting organization_id only works when the connection has exactly one organization.
 */
const action = createAction({
    description: 'Get a consolidated fulfillment, invoicing, and payment rollup for one Zoho Inventory sales order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.READ', 'ZohoInventory.invoices.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        let salesOrderData: unknown;

        // @allowTryCatch: a missing sales order is an expected outcome, not an error.
        try {
            // https://www.zoho.com/inventory/api/v1/sales-orders/#get-a-sales-order
            const salesOrderResponse = await nango.get({
                endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            });

            salesOrderData = salesOrderResponse.data;
        } catch (error) {
            if (getHttpStatus(error) === 404) {
                return { found: false };
            }

            throw error;
        }

        const salesOrderEnvelope = ProviderEnvelopeSchema.safeParse(salesOrderData);
        if (!salesOrderEnvelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when retrieving the sales order.',
                details: salesOrderEnvelope.error.message
            });
        }

        // Zoho reports a missing sales order with code 1002 ("Sales Order does not exist.").
        if (salesOrderEnvelope.data.code === 1002) {
            return { found: false };
        }

        if (salesOrderEnvelope.data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: salesOrderEnvelope.data.message, code: salesOrderEnvelope.data.code });
        }

        const providerResponse = z
            .object({
                salesorder: ProviderSalesOrderSchema
            })
            .parse(salesOrderData);

        const salesOrder = providerResponse.salesorder;
        const enrichedInvoices: z.infer<typeof EnrichedInvoiceSchema>[] = [];

        for (const invoiceRef of salesOrder.invoices ?? []) {
            // https://www.zoho.com/inventory/api/v1/invoices/#get-an-invoice
            const invoiceResponse = await nango.get({
                endpoint: `/inventory/v1/invoices/${encodeURIComponent(invoiceRef.invoice_id)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            });

            const invoiceEnvelope = ProviderEnvelopeSchema.safeParse(invoiceResponse.data);
            if (!invoiceEnvelope.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from Zoho Inventory API when retrieving a linked invoice.',
                    details: invoiceEnvelope.error.message
                });
            }

            if (invoiceEnvelope.data.code !== 0) {
                throw new nango.ActionError({ type: 'provider_error', message: invoiceEnvelope.data.message, code: invoiceEnvelope.data.code });
            }

            const invoice = z
                .object({
                    invoice: ProviderInvoiceSchema
                })
                .parse(invoiceResponse.data).invoice;

            enrichedInvoices.push({
                invoice_id: invoice.invoice_id,
                ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                ...(invoice.status != null && { status: invoice.status }),
                ...(invoice.date != null && { date: invoice.date }),
                ...(invoice.due_date != null && { due_date: invoice.due_date }),
                ...(invoice.total != null && { total: invoice.total }),
                ...(invoice.balance != null && { balance: invoice.balance }),
                ...(invoice.customer_id != null && { customer_id: invoice.customer_id }),
                ...(invoice.customer_name != null && { customer_name: invoice.customer_name }),
                ...(invoice.salesorder_id != null && { salesorder_id: invoice.salesorder_id })
            });
        }

        return {
            found: true,
            salesorder_id: salesOrder.salesorder_id,
            ...(salesOrder.salesorder_number != null && { salesorder_number: salesOrder.salesorder_number }),
            ...(salesOrder.order_status != null && { order_status: salesOrder.order_status }),
            ...(salesOrder.current_sub_status != null && { current_sub_status: salesOrder.current_sub_status }),
            ...(salesOrder.status != null && { status: salesOrder.status }),
            ...(salesOrder.invoiced_status != null && { invoiced_status: salesOrder.invoiced_status }),
            ...(salesOrder.paid_status != null && { paid_status: salesOrder.paid_status }),
            ...(salesOrder.shipped_status != null && { shipped_status: salesOrder.shipped_status }),
            ...(salesOrder.packages != null && { packages: salesOrder.packages }),
            invoices: enrichedInvoices
        };
    }
});

function getHttpStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
        return undefined;
    }

    if ('response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response) {
            const status = response.status;
            if (typeof status === 'number') {
                return status;
            }
        }
    }

    if ('status' in error) {
        const status = error.status;
        if (typeof status === 'number') {
            return status;
        }
    }

    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
