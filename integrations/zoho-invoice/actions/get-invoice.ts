import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('Zoho Invoice invoice ID to retrieve. Example: "260815000000124029"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho organization ID that owns the invoice; every Zoho Invoice endpoint requires it. Example: "927270289". It cannot be discovered through this connection (listing organizations needs the settings.READ scope), so supply it explicitly.'
            )
    })
    .describe('Identifies the invoice to retrieve and the organization it belongs to.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    rate: z.number().optional(),
    item_total: z.number().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    project_id: z.string().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    currency_code: z.string().optional(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    invoice_url: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    invoice: ProviderInvoiceSchema
});

const LineItemSchema = z.object({
    line_item_id: z.string().describe('Unique identifier of the invoice line item.'),
    item_id: z.string().optional().describe('ID of the catalog item billed; empty for ad-hoc/free-text line items.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity billed.'),
    unit: z.string().optional().describe('Unit of measure.'),
    rate: z.number().optional().describe('Rate charged per unit.'),
    item_total: z.number().optional().describe('Line total excluding tax.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item, if any.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item, if any.'),
    project_id: z.string().optional().describe('Project associated with the line item, if any.')
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('Unique identifier of the invoice.'),
        invoice_number: z.string().optional().describe('Human-readable invoice number.'),
        status: z.string().optional().describe('Invoice status, for example "draft", "sent", "partially_paid", "paid", "overdue" or "void".'),
        customer_id: z.string().optional().describe('ID of the customer (contact) the invoice is billed to.'),
        customer_name: z.string().optional().describe('Name of the customer (contact) the invoice is billed to.'),
        date: z.string().optional().describe('Invoice date in YYYY-MM-DD format.'),
        due_date: z.string().optional().describe('Payment due date in YYYY-MM-DD format.'),
        currency_code: z.string().optional().describe('ISO currency code of the invoice, for example "USD".'),
        sub_total: z.number().optional().describe('Sum of line item totals before tax and adjustments.'),
        tax_total: z.number().optional().describe('Total tax amount for the invoice.'),
        total: z.number().optional().describe('Final invoice total including tax, discounts and adjustments.'),
        balance: z.number().optional().describe('Outstanding amount still owed; 0 when the invoice is fully paid.'),
        notes: z.string().optional().describe('Notes shown on the invoice.'),
        terms: z.string().optional().describe('Terms and conditions shown on the invoice.'),
        invoice_url: z.string().optional().describe('Shareable customer-facing URL for viewing the invoice.'),
        created_time: z.string().optional().describe('Timestamp when the invoice was created, including timezone offset.'),
        last_modified_time: z.string().optional().describe('Timestamp when the invoice was last modified, including timezone offset.'),
        line_items: z.array(LineItemSchema).describe('Line items billed on the invoice, including rates, totals and per-line tax.')
    })
    .describe('A single Zoho Invoice invoice with its line items, status, total and outstanding balance.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single invoice from Zoho Invoice without modifying any provider data.
 * @pitfalls: organization_id is effectively required even though it is optional: the connection's granted scopes cannot list organizations, so omitting it makes the invoice lookup fail.
 */
const action = createAction({
    description: 'Get a single invoice by ID, including line items, status, total, and current balance.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/invoices/#retrieve-an-invoice
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                ...(input.organization_id !== undefined && { organization_id: input.organization_id })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found or the provider returned an unexpected response.',
                invoice_id: input.invoice_id
            });
        }

        const invoice = parsed.data.invoice;

        return {
            invoice_id: invoice.invoice_id,
            ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
            ...(invoice.status != null && { status: invoice.status }),
            ...(invoice.customer_id != null && { customer_id: invoice.customer_id }),
            ...(invoice.customer_name != null && { customer_name: invoice.customer_name }),
            ...(invoice.date != null && { date: invoice.date }),
            ...(invoice.due_date != null && { due_date: invoice.due_date }),
            ...(invoice.currency_code != null && { currency_code: invoice.currency_code }),
            ...(invoice.sub_total != null && { sub_total: invoice.sub_total }),
            ...(invoice.tax_total != null && { tax_total: invoice.tax_total }),
            ...(invoice.total != null && { total: invoice.total }),
            ...(invoice.balance != null && { balance: invoice.balance }),
            ...(invoice.notes != null && { notes: invoice.notes }),
            ...(invoice.terms != null && { terms: invoice.terms }),
            ...(invoice.invoice_url != null && { invoice_url: invoice.invoice_url }),
            ...(invoice.created_time != null && { created_time: invoice.created_time }),
            ...(invoice.last_modified_time != null && { last_modified_time: invoice.last_modified_time }),
            line_items: (invoice.line_items ?? []).map((lineItem) => ({
                line_item_id: lineItem.line_item_id,
                ...(lineItem.item_id != null && { item_id: lineItem.item_id }),
                ...(lineItem.name != null && { name: lineItem.name }),
                ...(lineItem.description != null && { description: lineItem.description }),
                ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
                ...(lineItem.unit != null && { unit: lineItem.unit }),
                ...(lineItem.rate != null && { rate: lineItem.rate }),
                ...(lineItem.item_total != null && { item_total: lineItem.item_total }),
                ...(lineItem.tax_name != null && { tax_name: lineItem.tax_name }),
                ...(lineItem.tax_percentage != null && { tax_percentage: lineItem.tax_percentage }),
                ...(lineItem.project_id != null && { project_id: lineItem.project_id })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
