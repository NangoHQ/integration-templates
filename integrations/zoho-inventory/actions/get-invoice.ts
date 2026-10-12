import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice to retrieve. Example: "260815000000160027"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving a single Zoho Inventory invoice by its ID.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().nullish(),
    item_id: z.string().nullish(),
    sku: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    unit: z.string().nullish(),
    quantity: z.number().nullish(),
    rate: z.number().nullish(),
    item_total: z.number().nullish(),
    tax_name: z.string().nullish(),
    tax_percentage: z.number().nullish()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().nullish(),
    status: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish(),
    reference_number: z.string().nullish(),
    currency_code: z.string().nullish(),
    sub_total: z.number().nullish(),
    tax_total: z.number().nullish(),
    discount_total: z.number().nullish(),
    shipping_charge: z.number().nullish(),
    adjustment: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    payment_made: z.number().nullish(),
    credits_applied: z.number().nullish(),
    last_payment_date: z.string().nullish(),
    salesorder_id: z.string().nullish(),
    salesorder_number: z.string().nullish(),
    notes: z.string().nullish(),
    terms: z.string().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    line_items: z.array(ProviderLineItemSchema).nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    invoice: ProviderInvoiceSchema.optional()
});

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the invoice line item. Example: "260815000000160039"'),
    item_id: z.string().optional().describe('ID of the inventory item billed on this line, when the line references an item.'),
    sku: z.string().optional().describe('SKU of the billed item, when set.'),
    name: z.string().optional().describe('Name of the item or line.'),
    description: z.string().optional().describe('Description of the line item.'),
    unit: z.string().optional().describe('Unit of measurement for the billed quantity.'),
    quantity: z.number().optional().describe('Quantity billed on this line.'),
    rate: z.number().optional().describe('Unit price for this line.'),
    item_total: z.number().optional().describe('Line total (quantity times rate, less any line discount).'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line, when taxed.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line.')
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('Unique ID of the invoice. Example: "260815000000160027"'),
        invoice_number: z.string().optional().describe('Human-readable invoice number. Example: "INV-000019"'),
        status: z.string().optional().describe('Invoice status, such as draft, sent, partially_paid, paid, overdue, void, or written_off.'),
        customer_id: z.string().optional().describe('ID of the customer (contact) the invoice was issued to.'),
        customer_name: z.string().optional().describe('Name of the customer the invoice was issued to.'),
        date: z.string().optional().describe('Invoice date in yyyy-MM-dd format.'),
        due_date: z.string().optional().describe('Payment due date in yyyy-MM-dd format.'),
        reference_number: z.string().optional().describe('Customer-facing reference number for the invoice.'),
        currency_code: z.string().optional().describe('ISO currency code of the invoice. Example: "USD"'),
        sub_total: z.number().optional().describe('Sum of line totals before tax, discount, shipping, and adjustment.'),
        tax_total: z.number().optional().describe('Total tax charged on the invoice.'),
        discount_total: z.number().optional().describe('Total discount applied to the invoice.'),
        shipping_charge: z.number().optional().describe('Shipping charge added to the invoice.'),
        adjustment: z.number().optional().describe('Manual adjustment added to the invoice total.'),
        total: z.number().optional().describe('Final invoice total.'),
        balance: z.number().optional().describe('Outstanding amount still due on the invoice.'),
        payment_made: z.number().optional().describe('Total amount of payments recorded against the invoice.'),
        credits_applied: z.number().optional().describe('Total credit-note amount applied to the invoice.'),
        last_payment_date: z.string().optional().describe('Date of the most recent payment applied to the invoice, when any.'),
        salesorder_id: z.string().optional().describe('ID of the linked sales order, when the invoice is associated with one.'),
        salesorder_number: z.string().optional().describe('Number of the linked sales order, when present.'),
        notes: z.string().optional().describe('Notes printed on the invoice.'),
        terms: z.string().optional().describe('Terms and conditions printed on the invoice.'),
        created_time: z.string().optional().describe('Creation timestamp including the organization timezone offset. Example: "2026-10-09T13:20:05-0400"'),
        last_modified_time: z.string().optional().describe('Last-modified timestamp including the organization timezone offset.'),
        line_items: z.array(OutputLineItemSchema).describe('Line items billed on the invoice.')
    })
    .describe('Full details of a single Zoho Inventory invoice, including line items, totals, balance, and payment totals.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing invoice from the provider without creating, updating, or deleting any provider state.
 * @pitfalls: salesorder_id and salesorder_number stay empty even when the invoice was created with a salesorder_id, so they cannot confirm a linked sales order. Payment totals are returned (payment_made, credits_applied, last_payment_date) but the individual payment records are not included. Optional fields often come back as empty strings rather than being omitted.
 */
const action = createAction({
    description: 'Get full details for one invoice by ID, including line items, balance due, and payment totals.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/invoices/#get-an-invoice
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message ?? 'Failed to retrieve invoice.',
                code: parsed.code
            });
        }

        const invoice = parsed.invoice;
        if (!invoice) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return the invoice.',
                invoice_id: input.invoice_id
            });
        }
        const payload = { invoice };

        return {
            invoice_id: payload.invoice.invoice_id,
            ...(payload.invoice.invoice_number != null && { invoice_number: payload.invoice.invoice_number }),
            ...(payload.invoice.status != null && { status: payload.invoice.status }),
            ...(payload.invoice.customer_id != null && { customer_id: payload.invoice.customer_id }),
            ...(payload.invoice.customer_name != null && { customer_name: payload.invoice.customer_name }),
            ...(payload.invoice.date != null && { date: payload.invoice.date }),
            ...(payload.invoice.due_date != null && { due_date: payload.invoice.due_date }),
            ...(payload.invoice.reference_number != null && { reference_number: payload.invoice.reference_number }),
            ...(payload.invoice.currency_code != null && { currency_code: payload.invoice.currency_code }),
            ...(payload.invoice.sub_total != null && { sub_total: payload.invoice.sub_total }),
            ...(payload.invoice.tax_total != null && { tax_total: payload.invoice.tax_total }),
            ...(payload.invoice.discount_total != null && { discount_total: payload.invoice.discount_total }),
            ...(payload.invoice.shipping_charge != null && { shipping_charge: payload.invoice.shipping_charge }),
            ...(payload.invoice.adjustment != null && { adjustment: payload.invoice.adjustment }),
            ...(payload.invoice.total != null && { total: payload.invoice.total }),
            ...(payload.invoice.balance != null && { balance: payload.invoice.balance }),
            ...(payload.invoice.payment_made != null && { payment_made: payload.invoice.payment_made }),
            ...(payload.invoice.credits_applied != null && { credits_applied: payload.invoice.credits_applied }),
            ...(payload.invoice.last_payment_date != null && { last_payment_date: payload.invoice.last_payment_date }),
            ...(payload.invoice.salesorder_id != null && { salesorder_id: payload.invoice.salesorder_id }),
            ...(payload.invoice.salesorder_number != null && { salesorder_number: payload.invoice.salesorder_number }),
            ...(payload.invoice.notes != null && { notes: payload.invoice.notes }),
            ...(payload.invoice.terms != null && { terms: payload.invoice.terms }),
            ...(payload.invoice.created_time != null && { created_time: payload.invoice.created_time }),
            ...(payload.invoice.last_modified_time != null && { last_modified_time: payload.invoice.last_modified_time }),
            line_items: (payload.invoice.line_items ?? []).map((item) => ({
                ...(item.line_item_id != null && { line_item_id: item.line_item_id }),
                ...(item.item_id != null && { item_id: item.item_id }),
                ...(item.sku != null && { sku: item.sku }),
                ...(item.name != null && { name: item.name }),
                ...(item.description != null && { description: item.description }),
                ...(item.unit != null && { unit: item.unit }),
                ...(item.quantity != null && { quantity: item.quantity }),
                ...(item.rate != null && { rate: item.rate }),
                ...(item.item_total != null && { item_total: item.item_total }),
                ...(item.tax_name != null && { tax_name: item.tax_name }),
                ...(item.tax_percentage != null && { tax_percentage: item.tax_percentage })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
