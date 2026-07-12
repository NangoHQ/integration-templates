import { z } from 'zod';
import { createAction } from 'nango';

const TransactionReferenceInputSchema = z.object({
    banking_provider: z.string(),
    provider_field_name: z.string(),
    provider_field_value: z.string()
});

const ImputationDatesSchema = z.object({
    start_date: z.string(),
    end_date: z.string()
});

const LedgerEntryLineSchema = z.object({
    label: z.string().min(1).max(255)
});

const InvoiceLineCreateSchema = z.object({
    currency_amount: z.string(),
    amount: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string().optional(),
    label: z.string(),
    quantity: z.number(),
    ledger_account_id: z.number().optional(),
    raw_currency_unit_price: z.string(),
    unit: z.string(),
    vat_rate: z.string(),
    description: z.string().nullable().optional(),
    product_id: z.number().optional(),
    imputation_dates: ImputationDatesSchema.nullable().optional(),
    ledger_entry_line: LedgerEntryLineSchema.optional()
});

const InvoiceLineUpdateSchema = z.object({
    id: z.number(),
    currency_amount: z.string().optional(),
    amount: z.string().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    label: z.string().optional(),
    quantity: z.number().optional(),
    ledger_account_id: z.number().optional(),
    raw_currency_unit_price: z.string().optional(),
    unit: z.string().optional(),
    vat_rate: z.string().optional(),
    description: z.string().nullable().optional(),
    product_id: z.number().optional(),
    imputation_dates: ImputationDatesSchema.nullable().optional(),
    ledger_entry_line: z
        .object({
            label: z.string().max(255).nullable()
        })
        .optional()
});

const InvoiceLineDeleteSchema = z.object({
    id: z.number()
});

const InvoiceLinesInputSchema = z.object({
    create: z.array(InvoiceLineCreateSchema).optional(),
    update: z.array(InvoiceLineUpdateSchema).optional(),
    delete: z.array(InvoiceLineDeleteSchema).optional()
});

const InputSchema = z.object({
    id: z.number().describe('The ID of the imported customer invoice. Example: 42'),
    date: z.string().optional().describe('Invoice date (ISO 8601). Example: 2023-08-30'),
    deadline: z.string().optional().describe('Invoice payment deadline (ISO 8601). Example: 2023-08-30'),
    customer_id: z.number().optional().describe('Customer identifier. Example: 42'),
    invoice_number: z.string().optional().describe('Invoice number. Example: F20230001'),
    currency: z.string().optional().describe('Invoice currency. Default: EUR'),
    currency_amount_before_tax: z.string().optional().describe('Invoice currency amount before tax. Example: 100.00'),
    currency_amount: z.string().optional().describe('Invoice currency amount. Example: 120.00'),
    amount: z.string().optional().describe('Invoice amount in euros. Example: 120.00'),
    currency_tax: z.string().optional().describe('Invoice taxable amount (in invoice currency). Example: 20.00'),
    tax: z.string().optional().describe('Invoice taxable amount (in euros). Example: 20.00'),
    transaction_reference: TransactionReferenceInputSchema.nullable().optional(),
    invoice_lines: InvoiceLinesInputSchema.optional(),
    external_reference: z.string().optional().describe('The unique external reference. Example: FR123')
});

const UrlResourceSchema = z.object({
    url: z.string()
});

const DiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const LedgerEntrySchema = z.object({
    id: z.number()
});

const CustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const CreditedInvoiceSchema = z.object({
    id: z.number(),
    url: z.string()
});

const QuoteSchema = z.object({
    id: z.number()
});

const BillingSubscriptionSchema = z.object({
    id: z.number()
});

const CustomerInvoiceTemplateSchema = z.object({
    id: z.number()
});

const TransactionReferenceOutputSchema = z.object({
    banking_provider: z.string(),
    provider_field_name: z.string(),
    provider_field_value: z.string()
});

const EInvoicingSchema = z.object({
    status: z.string(),
    reason: z.string().nullable(),
    flow: z
        .object({
            id: z.string()
        })
        .nullable()
});

const ProviderResponseSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    invoice_number: z.string().optional(),
    currency: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    currency_amount_before_tax: z.string().optional(),
    exchange_rate: z.string().optional(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    language: z.string().optional(),
    paid: z.boolean().optional(),
    status: z.string().optional(),
    discount: DiscountSchema.nullable().optional(),
    ledger_entry: LedgerEntrySchema.nullable().optional(),
    public_file_url: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    remaining_amount_with_tax: z.string().nullable().optional(),
    remaining_amount_without_tax: z.string().nullable().optional(),
    draft: z.boolean().optional(),
    special_mention: z.string().nullable().optional(),
    customer: CustomerSchema.nullable().optional(),
    invoice_line_sections: UrlResourceSchema.optional(),
    invoice_lines: UrlResourceSchema.optional(),
    custom_header_fields: UrlResourceSchema.optional(),
    categories: UrlResourceSchema.optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_description: z.string().nullable().optional(),
    billing_subscription: BillingSubscriptionSchema.nullable().optional(),
    credited_invoice: CreditedInvoiceSchema.nullable().optional(),
    customer_invoice_template: CustomerInvoiceTemplateSchema.nullable().optional(),
    transaction_reference: TransactionReferenceOutputSchema.nullable().optional(),
    payments: UrlResourceSchema.optional(),
    matched_transactions: UrlResourceSchema.optional(),
    appendices: UrlResourceSchema.optional(),
    quote: QuoteSchema.nullable().optional(),
    external_reference: z.string().optional(),
    e_invoicing: EInvoicingSchema.nullable().optional(),
    factur_x: z.boolean().optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    invoice_number: z.string().optional(),
    currency: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    currency_amount_before_tax: z.string().optional(),
    exchange_rate: z.string().optional(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    language: z.string().optional(),
    paid: z.boolean().optional(),
    status: z.string().optional(),
    discount: DiscountSchema.optional(),
    ledger_entry: LedgerEntrySchema.optional(),
    public_file_url: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    remaining_amount_with_tax: z.string().nullable().optional(),
    remaining_amount_without_tax: z.string().nullable().optional(),
    draft: z.boolean().optional(),
    special_mention: z.string().nullable().optional(),
    customer: CustomerSchema.nullable().optional(),
    invoice_line_sections: UrlResourceSchema.optional(),
    invoice_lines: UrlResourceSchema.optional(),
    custom_header_fields: UrlResourceSchema.optional(),
    categories: UrlResourceSchema.optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_description: z.string().nullable().optional(),
    billing_subscription: BillingSubscriptionSchema.nullable().optional(),
    credited_invoice: CreditedInvoiceSchema.nullable().optional(),
    customer_invoice_template: CustomerInvoiceTemplateSchema.nullable().optional(),
    transaction_reference: TransactionReferenceOutputSchema.nullable().optional(),
    payments: UrlResourceSchema.optional(),
    matched_transactions: UrlResourceSchema.optional(),
    appendices: UrlResourceSchema.optional(),
    quote: QuoteSchema.nullable().optional(),
    external_reference: z.string().optional(),
    e_invoicing: EInvoicingSchema.nullable().optional(),
    factur_x: z.boolean().optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update an imported customer invoice or credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.date !== undefined) {
            body['date'] = input.date;
        }
        if (input.deadline !== undefined) {
            body['deadline'] = input.deadline;
        }
        if (input.customer_id !== undefined) {
            body['customer_id'] = input.customer_id;
        }
        if (input.invoice_number !== undefined) {
            body['invoice_number'] = input.invoice_number;
        }
        if (input.currency !== undefined) {
            body['currency'] = input.currency;
        }
        if (input.currency_amount_before_tax !== undefined) {
            body['currency_amount_before_tax'] = input.currency_amount_before_tax;
        }
        if (input.currency_amount !== undefined) {
            body['currency_amount'] = input.currency_amount;
        }
        if (input.amount !== undefined) {
            body['amount'] = input.amount;
        }
        if (input.currency_tax !== undefined) {
            body['currency_tax'] = input.currency_tax;
        }
        if (input.tax !== undefined) {
            body['tax'] = input.tax;
        }
        if (input.transaction_reference !== undefined) {
            body['transaction_reference'] = input.transaction_reference;
        }
        if (input.invoice_lines !== undefined) {
            body['invoice_lines'] = input.invoice_lines;
        }
        if (input.external_reference !== undefined) {
            body['external_reference'] = input.external_reference;
        }

        const response = await nango.put({
            // https://pennylane.readme.io/reference/updateimportedcustomerinvoice
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.id))}/update_imported`,
            data: body,
            retries: 3
        });

        if (response.data === null || response.data === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an unexpected response from the Pennylane API.'
            });
        }

        const providerInvoice = ProviderResponseSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            ...(providerInvoice.label !== undefined && { label: providerInvoice.label }),
            ...(providerInvoice.invoice_number !== undefined && { invoice_number: providerInvoice.invoice_number }),
            ...(providerInvoice.currency !== undefined && { currency: providerInvoice.currency }),
            ...(providerInvoice.amount !== undefined && { amount: providerInvoice.amount }),
            ...(providerInvoice.currency_amount !== undefined && { currency_amount: providerInvoice.currency_amount }),
            ...(providerInvoice.currency_amount_before_tax !== undefined && { currency_amount_before_tax: providerInvoice.currency_amount_before_tax }),
            ...(providerInvoice.exchange_rate !== undefined && { exchange_rate: providerInvoice.exchange_rate }),
            ...(providerInvoice.date !== undefined && { date: providerInvoice.date }),
            ...(providerInvoice.deadline !== undefined && { deadline: providerInvoice.deadline }),
            ...(providerInvoice.currency_tax !== undefined && { currency_tax: providerInvoice.currency_tax }),
            ...(providerInvoice.tax !== undefined && { tax: providerInvoice.tax }),
            ...(providerInvoice.language !== undefined && { language: providerInvoice.language }),
            ...(providerInvoice.paid !== undefined && { paid: providerInvoice.paid }),
            ...(providerInvoice.status !== undefined && { status: providerInvoice.status }),
            ...(providerInvoice.discount !== undefined && { discount: providerInvoice.discount === null ? undefined : providerInvoice.discount }),
            ...(providerInvoice.ledger_entry !== undefined && {
                ledger_entry: providerInvoice.ledger_entry === null ? undefined : providerInvoice.ledger_entry
            }),
            ...(providerInvoice.public_file_url !== undefined && { public_file_url: providerInvoice.public_file_url }),
            ...(providerInvoice.filename !== undefined && { filename: providerInvoice.filename }),
            ...(providerInvoice.remaining_amount_with_tax !== undefined && { remaining_amount_with_tax: providerInvoice.remaining_amount_with_tax }),
            ...(providerInvoice.remaining_amount_without_tax !== undefined && { remaining_amount_without_tax: providerInvoice.remaining_amount_without_tax }),
            ...(providerInvoice.draft !== undefined && { draft: providerInvoice.draft }),
            ...(providerInvoice.special_mention !== undefined && { special_mention: providerInvoice.special_mention }),
            ...(providerInvoice.customer !== undefined && { customer: providerInvoice.customer }),
            ...(providerInvoice.invoice_line_sections !== undefined && { invoice_line_sections: providerInvoice.invoice_line_sections }),
            ...(providerInvoice.invoice_lines !== undefined && { invoice_lines: providerInvoice.invoice_lines }),
            ...(providerInvoice.custom_header_fields !== undefined && { custom_header_fields: providerInvoice.custom_header_fields }),
            ...(providerInvoice.categories !== undefined && { categories: providerInvoice.categories }),
            ...(providerInvoice.pdf_invoice_free_text !== undefined && { pdf_invoice_free_text: providerInvoice.pdf_invoice_free_text }),
            ...(providerInvoice.pdf_invoice_subject !== undefined && { pdf_invoice_subject: providerInvoice.pdf_invoice_subject }),
            ...(providerInvoice.pdf_description !== undefined && { pdf_description: providerInvoice.pdf_description }),
            ...(providerInvoice.billing_subscription !== undefined && { billing_subscription: providerInvoice.billing_subscription }),
            ...(providerInvoice.credited_invoice !== undefined && { credited_invoice: providerInvoice.credited_invoice }),
            ...(providerInvoice.customer_invoice_template !== undefined && { customer_invoice_template: providerInvoice.customer_invoice_template }),
            ...(providerInvoice.transaction_reference !== undefined && { transaction_reference: providerInvoice.transaction_reference }),
            ...(providerInvoice.payments !== undefined && { payments: providerInvoice.payments }),
            ...(providerInvoice.matched_transactions !== undefined && { matched_transactions: providerInvoice.matched_transactions }),
            ...(providerInvoice.appendices !== undefined && { appendices: providerInvoice.appendices }),
            ...(providerInvoice.quote !== undefined && { quote: providerInvoice.quote }),
            ...(providerInvoice.external_reference !== undefined && { external_reference: providerInvoice.external_reference }),
            ...(providerInvoice.e_invoicing !== undefined && { e_invoicing: providerInvoice.e_invoicing }),
            ...(providerInvoice.factur_x !== undefined && { factur_x: providerInvoice.factur_x }),
            ...(providerInvoice.archived_at !== undefined && { archived_at: providerInvoice.archived_at }),
            ...(providerInvoice.created_at !== undefined && { created_at: providerInvoice.created_at }),
            ...(providerInvoice.updated_at !== undefined && { updated_at: providerInvoice.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
