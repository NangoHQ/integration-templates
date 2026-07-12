import { z } from 'zod';
import { createAction } from 'nango';

const DiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const InvoiceLineDiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const ProductBasedInvoiceLineCreateSchema = z.object({
    product_id: z.number().int(),
    quantity: z.number(),
    label: z.string().optional(),
    ledger_account_id: z.number().int().optional(),
    raw_currency_unit_price: z.string().optional(),
    unit: z.string().optional(),
    vat_rate: z.string().optional(),
    description: z.string().nullable().optional(),
    section_rank: z.number().int().optional(),
    discount: InvoiceLineDiscountSchema.optional()
});

const StandardInvoiceLineCreateSchema = z.object({
    label: z.string(),
    quantity: z.number(),
    raw_currency_unit_price: z.string(),
    unit: z.string(),
    vat_rate: z.string(),
    ledger_account_id: z.number().int().optional(),
    description: z.string().nullable().optional(),
    section_rank: z.number().int().optional(),
    discount: InvoiceLineDiscountSchema.optional()
});

const InvoiceLineCreateSchema = z.union([ProductBasedInvoiceLineCreateSchema, StandardInvoiceLineCreateSchema]);

const InvoiceLineUpdateSchema = z.object({
    id: z.number().int(),
    label: z.string().optional(),
    quantity: z.number().optional(),
    ledger_account_id: z.number().int().optional(),
    raw_currency_unit_price: z.string().optional(),
    unit: z.string().optional(),
    vat_rate: z.string().optional(),
    description: z.string().nullable().optional(),
    product_id: z.number().int().optional(),
    discount: InvoiceLineDiscountSchema.optional(),
    section_rank: z.number().int().optional()
});

const InvoiceLineDeleteSchema = z.object({
    id: z.number().int()
});

const InvoiceLinesSchema = z.object({
    create: z.array(InvoiceLineCreateSchema).optional(),
    update: z.array(InvoiceLineUpdateSchema).optional(),
    delete: z.array(InvoiceLineDeleteSchema).optional()
});

const InputSchema = z.object({
    id: z.number().int().describe('Quote ID. Example: 25461979840512'),
    date: z.string().optional().describe('Quote date (ISO 8601). Example: 2023-08-30'),
    deadline: z.string().optional().describe('Quote validity deadline (ISO 8601). Example: 2024-08-30'),
    customer_id: z.number().int().optional().describe('Customer identifier. Example: 1338468995072'),
    quote_template_id: z.number().int().optional().describe('The quote template ID. Example: 42'),
    pdf_invoice_free_text: z.string().nullable().optional().describe('For example, the contact details of the person to contact'),
    pdf_invoice_subject: z.string().nullable().optional().describe('Quote title'),
    pdf_description: z.string().nullable().optional().describe('Quote description'),
    currency: z.string().optional().describe('Quote Currency (ISO 4217). Default is EUR.'),
    special_mention: z.string().nullable().optional().describe('Additional details'),
    discount: DiscountSchema.optional(),
    language: z.enum(['fr_FR', 'en_GB', 'de_DE']).optional(),
    invoice_lines: InvoiceLinesSchema.optional(),
    external_reference: z.string().optional().describe('The unique external reference that was assigned during creation either by you or Pennylane.')
});

const ProviderCustomerSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const ProviderDiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const ProviderQuoteSchema = z.object({
    id: z.number().int(),
    label: z.string().nullable(),
    quote_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().nullable(),
    deadline: z.string().nullable(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.string(),
    status: z.string(),
    discount: ProviderDiscountSchema,
    public_file_url: z.string().nullable(),
    filename: z.string().nullable(),
    special_mention: z.string().nullable(),
    customer: ProviderCustomerSchema.nullable(),
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    pdf_description: z.string().nullable(),
    quote_template: z.object({ id: z.number().int() }).nullable(),
    external_reference: z.string(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    label: z.string().optional(),
    quote_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.string(),
    status: z.string(),
    discount: ProviderDiscountSchema,
    public_file_url: z.string().optional(),
    filename: z.string().optional(),
    special_mention: z.string().optional(),
    customer_id: z.number().int().optional(),
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    pdf_description: z.string().optional(),
    quote_template_id: z.number().int().optional(),
    external_reference: z.string(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update a quote.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.date !== undefined && { date: input.date }),
            ...(input.deadline !== undefined && { deadline: input.deadline }),
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.quote_template_id !== undefined && { quote_template_id: input.quote_template_id }),
            ...(input.pdf_invoice_free_text !== undefined && { pdf_invoice_free_text: input.pdf_invoice_free_text }),
            ...(input.pdf_invoice_subject !== undefined && { pdf_invoice_subject: input.pdf_invoice_subject }),
            ...(input.pdf_description !== undefined && { pdf_description: input.pdf_description }),
            ...(input.currency !== undefined && { currency: input.currency }),
            ...(input.special_mention !== undefined && { special_mention: input.special_mention }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.language !== undefined && { language: input.language }),
            ...(input.invoice_lines !== undefined && { invoice_lines: input.invoice_lines }),
            ...(input.external_reference !== undefined && { external_reference: input.external_reference })
        };

        // https://pennylane.readme.io/reference/updatequote
        const response = await nango.put({
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(input.id))}`,
            data: body,
            retries: 3
        });

        const providerQuote = ProviderQuoteSchema.parse(response.data);

        return {
            id: providerQuote.id,
            ...(providerQuote.label != null && { label: providerQuote.label }),
            quote_number: providerQuote.quote_number,
            currency: providerQuote.currency,
            amount: providerQuote.amount,
            currency_amount: providerQuote.currency_amount,
            currency_amount_before_tax: providerQuote.currency_amount_before_tax,
            exchange_rate: providerQuote.exchange_rate,
            ...(providerQuote.date != null && { date: providerQuote.date }),
            ...(providerQuote.deadline != null && { deadline: providerQuote.deadline }),
            currency_tax: providerQuote.currency_tax,
            tax: providerQuote.tax,
            language: providerQuote.language,
            status: providerQuote.status,
            discount: providerQuote.discount,
            ...(providerQuote.public_file_url != null && { public_file_url: providerQuote.public_file_url }),
            ...(providerQuote.filename != null && { filename: providerQuote.filename }),
            ...(providerQuote.special_mention != null && { special_mention: providerQuote.special_mention }),
            ...(providerQuote.customer != null && { customer_id: providerQuote.customer.id }),
            pdf_invoice_free_text: providerQuote.pdf_invoice_free_text,
            pdf_invoice_subject: providerQuote.pdf_invoice_subject,
            ...(providerQuote.pdf_description != null && { pdf_description: providerQuote.pdf_description }),
            ...(providerQuote.quote_template != null && { quote_template_id: providerQuote.quote_template.id }),
            external_reference: providerQuote.external_reference,
            ...(providerQuote.archived_at != null && { archived_at: providerQuote.archived_at }),
            created_at: providerQuote.created_at,
            updated_at: providerQuote.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
