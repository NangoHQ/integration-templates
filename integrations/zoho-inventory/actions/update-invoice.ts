import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InvoiceLineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('ID of an existing line item to update. Omit to add a new line. Example: "260815000000170230"'),
    item_id: z.string().optional().describe('ID of the inventory item for this line. Omit for a free-text line item.'),
    name: z.string().optional().describe('Name of the line item. Example: "Consulting"'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item. Example: 2'),
    rate: z.number().optional().describe('Unit rate of the line item. Example: 150'),
    unit: z.string().optional().describe('Unit of measure for the line item. Example: "Nos"'),
    discount: z.number().optional().describe('Discount for the line item.'),
    discount_amount: z.number().optional().describe('Flat discount amount for the line item.'),
    tax_id: z.string().optional().describe('ID of the tax or tax group applied to the line item.'),
    location_id: z.string().optional().describe('ID of the location from which the item is fulfilled.')
});

const CustomFieldInputSchema = z.object({
    customfield_id: z.string().optional().describe('ID of the custom field to set.'),
    value: z.string().optional().describe('Value of the custom field.'),
    label: z.string().optional().describe('Label of the custom field.'),
    show_on_pdf: z.boolean().optional().describe('Whether the custom field is displayed on the invoice PDF.')
});

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho Inventory organization. Example: "927270289"'),
        invoice_id: z.string().describe('ID of the invoice to update. Example: "260815000000170225"'),
        customer_id: z.string().optional().describe('ID of the customer the invoice belongs to.'),
        invoice_number: z.string().optional().describe('Unique invoice number. Only changeable while the invoice is a draft. Example: "INV-00042"'),
        reference_number: z.string().optional().describe('Reference number for the invoice. Example: "PO-1234"'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format. Example: "2026-10-09"'),
        due_date: z.string().optional().describe('Invoice due date in yyyy-mm-dd format. Example: "2026-10-24"'),
        payment_terms: z.number().optional().describe('Payment terms in days, used to compute the due date. Example: 15'),
        payment_terms_label: z.string().optional().describe('Overrides the default payment terms label. Example: "Net 15"'),
        discount: z.number().optional().describe('Entity-level discount as a flat amount.'),
        discount_type: z.enum(['entity_level', 'item_level']).optional().describe('Where the discount is applied: at the invoice level or per line item.'),
        is_discount_before_tax: z.boolean().optional().describe('Whether the discount is applied before tax.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are inclusive of tax.'),
        exchange_rate: z.number().optional().describe('Exchange rate for the invoice currency. Example: 1'),
        salesperson_name: z.string().optional().describe('Name of the salesperson.'),
        template_id: z.string().optional().describe('ID of the PDF template to use for the invoice.'),
        notes: z.string().optional().describe('Notes shown below the invoice.'),
        terms: z.string().optional().describe('Terms and conditions shown below the invoice.'),
        shipping_charge: z.number().optional().describe('Shipping charge applied to the invoice.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the invoice.'),
        adjustment_description: z.string().optional().describe('Description of the adjustment. Example: "Rounding off"'),
        line_items: z.array(InvoiceLineItemInputSchema).optional().describe('Full replacement list of line items. Remove an entry to delete that line.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom field values to set on the invoice.')
    })
    .describe('Fields to update on a Zoho Inventory invoice. Omitted top-level fields are left unchanged.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    item_total: z.number().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    sub_total: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    invoice: ProviderInvoiceSchema
});

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('ID of the line item.'),
    item_id: z.string().optional().describe('ID of the inventory item, if the line is linked to one.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    rate: z.number().optional().describe('Unit rate of the line item.'),
    unit: z.string().optional().describe('Unit of measure for the line item.'),
    item_total: z.number().optional().describe('Line total including discounts and tax.')
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the updated invoice.'),
        invoice_number: z.string().optional().describe('Invoice number.'),
        status: z.string().optional().describe('Invoice status after the update, e.g. "draft".'),
        customer_id: z.string().optional().describe('ID of the customer.'),
        customer_name: z.string().optional().describe('Name of the customer.'),
        reference_number: z.string().optional().describe('Reference number.'),
        date: z.string().optional().describe('Invoice date.'),
        due_date: z.string().optional().describe('Invoice due date.'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax and adjustments.'),
        total: z.number().optional().describe('Invoice total.'),
        balance: z.number().optional().describe('Outstanding balance on the invoice.'),
        notes: z.string().optional().describe('Notes shown below the invoice.'),
        terms: z.string().optional().describe('Terms and conditions shown below the invoice.'),
        created_time: z.string().optional().describe('Creation timestamp.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items on the updated invoice.')
    })
    .describe('The updated Zoho Inventory invoice.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT to Zoho Inventory that mutates an existing invoice's fields and line items.
 * @pitfalls: Only draft invoices can be updated. line_items is a full replacement list, so omitting a line deletes it; resend every line you want to keep. Other omitted top-level fields are left unchanged, and a partial update without customer_id or line_items is accepted even though the docs mark both as required.
 */
const action = createAction({
    description: 'Update an existing invoice in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.due_date !== undefined && { due_date: input.due_date }),
            ...(input.payment_terms !== undefined && { payment_terms: input.payment_terms }),
            ...(input.payment_terms_label !== undefined && { payment_terms_label: input.payment_terms_label }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.salesperson_name !== undefined && { salesperson_name: input.salesperson_name }),
            ...(input.template_id !== undefined && { template_id: input.template_id }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.shipping_charge !== undefined && { shipping_charge: input.shipping_charge }),
            ...(input.adjustment !== undefined && { adjustment: input.adjustment }),
            ...(input.adjustment_description !== undefined && { adjustment_description: input.adjustment_description }),
            ...(input.line_items !== undefined && {
                line_items: input.line_items.map((item) => ({
                    ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                    ...(item.discount !== undefined && { discount: item.discount }),
                    ...(item.discount_amount !== undefined && { discount_amount: item.discount_amount }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.location_id !== undefined && { location_id: item.location_id })
                }))
            }),
            ...(input.custom_fields !== undefined && {
                custom_fields: input.custom_fields.map((field) => ({
                    ...(field.customfield_id !== undefined && { customfield_id: field.customfield_id }),
                    ...(field.value !== undefined && { value: field.value }),
                    ...(field.label !== undefined && { label: field.label }),
                    ...(field.show_on_pdf !== undefined && { show_on_pdf: field.show_on_pdf })
                }))
            })
        };

        const config: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/invoices/#update-an-invoice
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data,
            retries: 3
        };

        const response = await nango.put<unknown>(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return an updated invoice.',
                invoice_id: input.invoice_id
            });
        }

        const invoice = parsed.data.invoice;

        return {
            invoice_id: invoice.invoice_id,
            ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
            ...(invoice.status !== undefined && { status: invoice.status }),
            ...(invoice.customer_id !== undefined && { customer_id: invoice.customer_id }),
            ...(invoice.customer_name !== undefined && { customer_name: invoice.customer_name }),
            ...(invoice.reference_number !== undefined && { reference_number: invoice.reference_number }),
            ...(invoice.date !== undefined && { date: invoice.date }),
            ...(invoice.due_date !== undefined && { due_date: invoice.due_date }),
            ...(invoice.sub_total !== undefined && { sub_total: invoice.sub_total }),
            ...(invoice.total !== undefined && { total: invoice.total }),
            ...(invoice.balance !== undefined && { balance: invoice.balance }),
            ...(invoice.notes !== undefined && { notes: invoice.notes }),
            ...(invoice.terms !== undefined && { terms: invoice.terms }),
            ...(invoice.created_time !== undefined && { created_time: invoice.created_time }),
            ...(invoice.last_modified_time !== undefined && { last_modified_time: invoice.last_modified_time }),
            ...(invoice.line_items !== undefined && {
                line_items: invoice.line_items.map((item) => ({
                    ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                    ...(item.item_total !== undefined && { item_total: item.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
