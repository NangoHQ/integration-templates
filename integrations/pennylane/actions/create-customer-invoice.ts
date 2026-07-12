import { z } from 'zod';
import { createAction } from 'nango';

const InvoiceDiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']).describe('Discount type'),
    value: z.string().describe('Discount value')
});

const ProductInvoiceLineSchema = z.object({
    product_id: z.number().describe('Product ID. Example: 87538491392'),
    quantity: z.number().describe('Quantity. Example: 2'),
    label: z.string().optional().describe('Line item label'),
    ledger_account_id: z.number().optional().describe('Ledger account ID'),
    raw_currency_unit_price: z.string().optional().describe('Unit price excluding taxes. Example: "100.00"'),
    unit: z.string().optional().describe('Line item unit. Example: "piece"'),
    vat_rate: z.string().optional().describe('VAT rate code. Example: "FR_200"'),
    section_rank: z.number().optional().describe('Section rank'),
    discount: InvoiceDiscountSchema.optional().describe('Line discount'),
    description: z.string().nullable().optional().describe('Line description')
});

const StandardInvoiceLineSchema = z.object({
    label: z.string().describe('Line item label'),
    raw_currency_unit_price: z.string().describe('Unit price excluding taxes. Example: "100.00"'),
    unit: z.string().describe('Line item unit. Example: "piece"'),
    vat_rate: z.string().describe('VAT rate code. Example: "FR_200"'),
    quantity: z.number().describe('Quantity. Example: 2'),
    ledger_account_id: z.number().optional().describe('Ledger account ID'),
    section_rank: z.number().optional().describe('Section rank'),
    discount: InvoiceDiscountSchema.optional().describe('Line discount'),
    description: z.string().nullable().optional().describe('Line description')
});

const InvoiceLineSchema = z.union([ProductInvoiceLineSchema, StandardInvoiceLineSchema]);

const InputSchema = z.object({
    customer_id: z.number().describe('Customer ID. Example: 1338468995072'),
    date: z.string().describe('Invoice date (ISO 8601). Example: "2026-07-08"'),
    deadline: z.string().describe('Payment deadline (ISO 8601). Example: "2026-07-31"'),
    draft: z.boolean().describe('Whether to create as draft. Example: true'),
    invoice_lines: z.array(InvoiceLineSchema).min(1).describe('Invoice line items'),
    customer_invoice_template_id: z.number().optional().describe('Customer invoice template ID'),
    pdf_invoice_free_text: z.string().nullable().optional().describe('Free text on PDF'),
    pdf_invoice_subject: z.string().nullable().optional().describe('Invoice title'),
    pdf_description: z.string().nullable().optional().describe('Invoice description'),
    currency: z.string().optional().describe('Currency code. Default: EUR'),
    special_mention: z.string().nullable().optional().describe('Special mention'),
    language: z.string().optional().describe('Language code. Example: "fr_FR"'),
    label: z.string().nullable().optional().describe('Custom accounting label'),
    external_reference: z.string().optional().describe('External reference'),
    discount: InvoiceDiscountSchema.optional().describe('Invoice-level discount'),
    invoice_line_sections: z
        .array(
            z.object({
                title: z.string().optional().describe('Section title'),
                description: z.string().optional().describe('Section description'),
                rank: z.number().describe('Section rank')
            })
        )
        .optional()
        .describe('Invoice line sections')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        invoice_number: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        deadline: z.string().nullable().optional(),
        draft: z.boolean().nullable().optional(),
        customer: z
            .object({
                id: z.number()
            })
            .optional(),
        customer_id: z.number().optional(),
        currency_amount: z.string().nullable().optional(),
        currency_amount_before_tax: z.string().nullable().optional(),
        currency_tax: z.string().nullable().optional(),
        pdf_invoice_subject: z.string().nullable().optional(),
        pdf_invoice_free_text: z.string().nullable().optional(),
        pdf_description: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        special_mention: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        label: z.string().nullable().optional(),
        external_reference: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    status: z.string(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    draft: z.boolean().optional(),
    customer_id: z.number().optional(),
    currency_amount: z.string().optional(),
    currency_amount_before_tax: z.string().optional(),
    currency_tax: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_description: z.string().optional(),
    currency: z.string().optional(),
    special_mention: z.string().optional(),
    language: z.string().optional(),
    label: z.string().optional(),
    external_reference: z.string().optional()
});

const action = createAction({
    description: 'Create a draft or finalized customer invoice or credit note',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/postcustomerinvoices
            endpoint: '/api/external/v2/customer_invoices',
            data: {
                customer_id: input.customer_id,
                date: input.date,
                deadline: input.deadline,
                draft: input.draft,
                invoice_lines: input.invoice_lines,
                ...(input.customer_invoice_template_id !== undefined && { customer_invoice_template_id: input.customer_invoice_template_id }),
                ...(input.pdf_invoice_free_text !== undefined && { pdf_invoice_free_text: input.pdf_invoice_free_text }),
                ...(input.pdf_invoice_subject !== undefined && { pdf_invoice_subject: input.pdf_invoice_subject }),
                ...(input.pdf_description !== undefined && { pdf_description: input.pdf_description }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.special_mention !== undefined && { special_mention: input.special_mention }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.label !== undefined && { label: input.label }),
                ...(input.external_reference !== undefined && { external_reference: input.external_reference }),
                ...(input.discount !== undefined && { discount: input.discount }),
                ...(input.invoice_line_sections !== undefined && { invoice_line_sections: input.invoice_line_sections })
            },
            retries: 10
        });

        const providerInvoice = ProviderInvoiceSchema.parse(response.data);
        const customerId = providerInvoice.customer?.id ?? providerInvoice.customer_id;

        return {
            id: providerInvoice.id,
            status: providerInvoice.status,
            ...(providerInvoice.invoice_number != null && { invoice_number: providerInvoice.invoice_number }),
            ...(providerInvoice.date != null && { date: providerInvoice.date }),
            ...(providerInvoice.deadline != null && { deadline: providerInvoice.deadline }),
            ...(providerInvoice.draft != null && { draft: providerInvoice.draft }),
            ...(customerId != null && { customer_id: customerId }),
            ...(providerInvoice.currency_amount != null && { currency_amount: providerInvoice.currency_amount }),
            ...(providerInvoice.currency_amount_before_tax != null && { currency_amount_before_tax: providerInvoice.currency_amount_before_tax }),
            ...(providerInvoice.currency_tax != null && { currency_tax: providerInvoice.currency_tax }),
            ...(providerInvoice.pdf_invoice_subject != null && { pdf_invoice_subject: providerInvoice.pdf_invoice_subject }),
            ...(providerInvoice.pdf_invoice_free_text != null && { pdf_invoice_free_text: providerInvoice.pdf_invoice_free_text }),
            ...(providerInvoice.pdf_description != null && { pdf_description: providerInvoice.pdf_description }),
            ...(providerInvoice.currency != null && { currency: providerInvoice.currency }),
            ...(providerInvoice.special_mention != null && { special_mention: providerInvoice.special_mention }),
            ...(providerInvoice.language != null && { language: providerInvoice.language }),
            ...(providerInvoice.label != null && { label: providerInvoice.label }),
            ...(providerInvoice.external_reference != null && { external_reference: providerInvoice.external_reference })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
