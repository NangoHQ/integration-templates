import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('ID of an existing line item to keep and update. Omit to add a new line item. Example: "260815000000166012".'),
    item_id: z.string().optional().describe('ID of an existing catalog item. Optional because free-text line items can be created without one.'),
    name: z.string().optional().describe('Name of the line item. Example: "Consulting hours"'),
    description: z.string().optional().describe('Description of the line item. Example: "October onboarding work"'),
    quantity: z.number().optional().describe('Quantity of the line item. Example: 2'),
    rate: z.number().optional().describe('Unit rate of the line item. Example: 150.5'),
    unit: z.string().optional().describe('Unit of measure for the line item. Example: "hours"'),
    tax_id: z.string().optional().describe('ID of a tax or tax group applied to the line item.'),
    discount: z.union([z.string(), z.number()]).optional().describe('Line-item discount, as a percentage string (e.g. "10%") or a flat amount.')
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'ID of the Zoho Invoice organization. Required on every call; it cannot be reliably discovered with a module-scoped connection. Example: "1234567890"'
            ),
        invoice_id: z.string().describe('ID of the invoice to update. Example: "123456789012345678"'),
        customer_id: z
            .string()
            .optional()
            .describe('ID of the customer to bill. Zoho rejects a customer change once payments have been recorded on the invoice.'),
        contact_persons: z.array(z.string()).optional().describe('IDs of the contact persons associated with the invoice.'),
        invoice_number: z.string().optional().describe('Unique invoice number. Must not collide with an existing invoice number.'),
        reference_number: z.string().optional().describe('Free-form reference number for the invoice.'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format. Example: "2026-10-07"'),
        due_date: z.string().optional().describe('Payment due date in yyyy-mm-dd format. Example: "2026-11-06"'),
        payment_terms: z.number().optional().describe('Payment terms in days (e.g. 15, 30, 60), used to derive the due date.'),
        payment_terms_label: z.string().optional().describe('Label overriding the default payment terms text.'),
        discount: z.union([z.string(), z.number()]).optional().describe('Invoice-level discount, as a percentage string (e.g. "10%") or a flat amount.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the invoice.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the invoice.'),
        adjustment_description: z.string().optional().describe('Description for the adjustment. Example: "Rounding off"'),
        notes: z.string().optional().describe('Notes shown at the bottom of the invoice.'),
        terms: z.string().optional().describe('Terms and conditions shown on the invoice.'),
        line_items: z.array(LineItemInputSchema).optional().describe('Full replacement list of line items. Any existing line not included is deleted.')
    })
    .describe('Fields that can be changed on an existing Zoho Invoice invoice; only the provided fields are applied.');

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Provider ID of the line item.'),
    item_id: z.string().optional().describe('ID of the catalog item, when the line references one.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    rate: z.number().optional().describe('Unit rate of the line item.'),
    item_total: z.number().optional().describe('Total amount for the line item.')
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the updated invoice.'),
        invoice_number: z.string().optional().describe('Invoice number.'),
        status: z.string().optional().describe('Current status of the invoice (e.g. draft, sent, partially_paid, paid, void).'),
        customer_id: z.string().optional().describe('ID of the billed customer.'),
        customer_name: z.string().optional().describe('Name of the billed customer.'),
        date: z.string().optional().describe('Invoice date.'),
        due_date: z.string().optional().describe('Payment due date.'),
        reference_number: z.string().optional().describe('Reference number of the invoice.'),
        sub_total: z.number().optional().describe('Sum of line-item amounts before tax.'),
        tax_total: z.number().optional().describe('Total tax on the invoice.'),
        total: z.number().optional().describe('Final invoice total.'),
        balance: z.number().optional().describe('Outstanding amount still owed on the invoice.'),
        last_modified_time: z.string().optional().describe('Provider timestamp of the last modification.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items currently on the invoice.')
    })
    .describe('The invoice as it exists after the update, including its current totals and line items.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    rate: z.number().optional(),
    item_total: z.number().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    reference_number: z.string().optional(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    last_modified_time: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const UpdateInvoiceResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    invoice: ProviderInvoiceSchema.nullable().optional()
});

/**
 * @tags: [write]
 * @tagReason: Mutates an existing invoice on the provider by replacing its customer, line items, or other fields.
 * @pitfalls: Providing line_items replaces the entire existing list, so any omitted line is deleted; void invoices cannot be edited, sent or paid invoices reject changes without a reason this action cannot supply, and the customer cannot be changed once payments exist.
 */
const action = createAction({
    description: 'Update an existing invoice, including its customer, line items, or other fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons }),
            ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.due_date !== undefined && { due_date: input.due_date }),
            ...(input.payment_terms !== undefined && { payment_terms: input.payment_terms }),
            ...(input.payment_terms_label !== undefined && { payment_terms_label: input.payment_terms_label }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.line_items !== undefined && { line_items: input.line_items })
        };

        // https://www.zoho.com/invoice/api/v3/invoices/#update-an-invoice
        const response = await nango.put({
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: body,
            retries: 3
        });

        const parsed = UpdateInvoiceResponseSchema.parse(response.data);

        if (parsed.code !== 0 || !parsed.invoice) {
            throw new nango.ActionError({
                type: 'update_invoice_failed',
                message: parsed.message ?? 'Failed to update the invoice.',
                code: parsed.code
            });
        }

        const invoice = parsed.invoice;

        return {
            invoice_id: invoice.invoice_id,
            ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
            ...(invoice.status !== undefined && { status: invoice.status }),
            ...(invoice.customer_id !== undefined && { customer_id: invoice.customer_id }),
            ...(invoice.customer_name !== undefined && { customer_name: invoice.customer_name }),
            ...(invoice.date !== undefined && { date: invoice.date }),
            ...(invoice.due_date !== undefined && { due_date: invoice.due_date }),
            ...(invoice.reference_number !== undefined && { reference_number: invoice.reference_number }),
            ...(invoice.sub_total !== undefined && { sub_total: invoice.sub_total }),
            ...(invoice.tax_total !== undefined && { tax_total: invoice.tax_total }),
            ...(invoice.total !== undefined && { total: invoice.total }),
            ...(invoice.balance !== undefined && { balance: invoice.balance }),
            ...(invoice.last_modified_time !== undefined && { last_modified_time: invoice.last_modified_time }),
            ...(invoice.line_items !== undefined && {
                line_items: invoice.line_items.map((item) => ({
                    ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.item_total !== undefined && { item_total: item.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
