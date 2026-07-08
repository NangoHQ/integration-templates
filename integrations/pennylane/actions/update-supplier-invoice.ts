import { z } from 'zod';
import { createAction } from 'nango';

const TransactionReferenceSchema = z.object({
    banking_provider: z.string(),
    provider_field_name: z.string(),
    provider_field_value: z.string()
});

const InvoiceLineCreateSchema = z.object({
    label: z.string(),
    description: z.string().optional(),
    currency_amount: z.string(),
    amount: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string().optional(),
    ledger_account_id: z.number().optional(),
    vat_rate: z.string(),
    imputation_dates: z
        .object({
            start_date: z.string(),
            end_date: z.string()
        })
        .optional(),
    ledger_entry_line: z
        .object({
            label: z.string()
        })
        .optional()
});

const InvoiceLineUpdateSchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    description: z.string().optional(),
    currency_amount: z.string().optional(),
    amount: z.string().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    ledger_account_id: z.number().optional(),
    vat_rate: z.string().optional(),
    imputation_dates: z
        .object({
            start_date: z.string(),
            end_date: z.string()
        })
        .optional(),
    ledger_entry_line: z
        .object({
            label: z.string().nullable().optional()
        })
        .optional()
});

const InvoiceLineDeleteSchema = z.object({
    id: z.number()
});

const InvoiceLinesInputSchema = z
    .object({
        create: z.array(InvoiceLineCreateSchema).optional(),
        update: z.array(InvoiceLineUpdateSchema).optional(),
        delete: z.array(InvoiceLineDeleteSchema).optional()
    })
    .optional();

const InputSchema = z.object({
    id: z.number().describe('Supplier invoice identifier. Example: 123'),
    supplier_id: z.number().optional().describe('The ID of the supplier. Example: 456'),
    date: z.string().optional().describe('The date of the invoice (ISO 8601). Example: 2021-01-30'),
    deadline: z.string().optional().describe('Invoice payment deadline (ISO 8601). Example: 2021-01-30'),
    invoice_number: z.string().optional().describe('The invoice number. Example: F20230001'),
    label: z.string().nullable().optional().describe('Custom label for the invoice used on accounting entries. Example: Custom accounting label'),
    currency: z.string().optional().describe('Invoice currency. Example: EUR'),
    currency_amount_before_tax: z.string().optional().describe('Invoice currency amount before tax. Example: 100.00'),
    currency_amount: z.string().optional().describe('Invoice currency amount. Example: 120.00'),
    amount: z.string().optional().describe('Invoice amount in euros. Example: 120.00'),
    currency_tax: z.string().optional().describe('Invoice taxable amount in invoice currency. Example: 20.00'),
    tax: z.string().optional().describe('Invoice taxable amount in euros. Example: 20.00'),
    transaction_reference: TransactionReferenceSchema.nullable().optional(),
    invoice_lines: InvoiceLinesInputSchema,
    external_reference: z.string().optional().describe('The unique external reference. Example: FR123')
});

const SupplierSchema = z.object({
    id: z.number(),
    url: z.string()
});

const InvoiceLinesUrlSchema = z.object({
    url: z.string()
});

const TransactionReferenceResponseSchema = z.object({
    banking_provider: z.string(),
    provider_field_name: z.string(),
    provider_field_value: z.string()
});

const ProviderSupplierInvoiceSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    reconciled: z.boolean(),
    accounting_status: z.string(),
    filename: z.string().nullable().optional(),
    public_file_url: z.string().nullable().optional(),
    remaining_amount_with_tax: z.string().nullable().optional(),
    remaining_amount_without_tax: z.string().nullable().optional(),
    ledger_entry: z
        .object({
            id: z.number()
        })
        .optional(),
    supplier: SupplierSchema.nullable().optional(),
    invoice_lines: InvoiceLinesUrlSchema.optional(),
    categories: InvoiceLinesUrlSchema.optional(),
    transaction_reference: TransactionReferenceResponseSchema.nullable().optional(),
    payment_status: z.string(),
    paid: z.boolean(),
    payments: InvoiceLinesUrlSchema.optional(),
    matched_transactions: InvoiceLinesUrlSchema.optional(),
    external_reference: z.string(),
    e_invoicing: z
        .object({
            status: z.string().nullable().optional(),
            reason: z.string().nullable().optional(),
            flow: z
                .object({
                    id: z.string()
                })
                .nullable()
                .optional(),
            source_file_url: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    reconciled: z.boolean(),
    accounting_status: z.string(),
    filename: z.string().optional(),
    public_file_url: z.string().optional(),
    remaining_amount_with_tax: z.string().optional(),
    remaining_amount_without_tax: z.string().optional(),
    ledger_entry_id: z.number().optional(),
    supplier_id: z.number().optional(),
    supplier_url: z.string().optional(),
    invoice_lines_url: z.string().optional(),
    categories_url: z.string().optional(),
    transaction_reference: TransactionReferenceResponseSchema.optional(),
    payment_status: z.string(),
    paid: z.boolean(),
    payments_url: z.string().optional(),
    matched_transactions_url: z.string().optional(),
    external_reference: z.string(),
    e_invoicing_status: z.string().optional(),
    e_invoicing_reason: z.string().optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update a supplier invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putsupplierinvoice
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.supplier_id !== undefined && { supplier_id: input.supplier_id }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.deadline !== undefined && { deadline: input.deadline }),
                ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
                ...(input.label !== undefined && { label: input.label }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.currency_amount_before_tax !== undefined && { currency_amount_before_tax: input.currency_amount_before_tax }),
                ...(input.currency_amount !== undefined && { currency_amount: input.currency_amount }),
                ...(input.amount !== undefined && { amount: input.amount }),
                ...(input.currency_tax !== undefined && { currency_tax: input.currency_tax }),
                ...(input.tax !== undefined && { tax: input.tax }),
                ...(input.transaction_reference !== undefined && { transaction_reference: input.transaction_reference }),
                ...(input.invoice_lines !== undefined && { invoice_lines: input.invoice_lines }),
                ...(input.external_reference !== undefined && { external_reference: input.external_reference })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Pennylane API.'
            });
        }

        const providerInvoice = ProviderSupplierInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            ...(providerInvoice.label != null && { label: providerInvoice.label }),
            invoice_number: providerInvoice.invoice_number,
            currency: providerInvoice.currency,
            amount: providerInvoice.amount,
            currency_amount: providerInvoice.currency_amount,
            currency_amount_before_tax: providerInvoice.currency_amount_before_tax,
            exchange_rate: providerInvoice.exchange_rate,
            ...(providerInvoice.date != null && { date: providerInvoice.date }),
            ...(providerInvoice.deadline != null && { deadline: providerInvoice.deadline }),
            currency_tax: providerInvoice.currency_tax,
            tax: providerInvoice.tax,
            reconciled: providerInvoice.reconciled,
            accounting_status: providerInvoice.accounting_status,
            ...(providerInvoice.filename != null && { filename: providerInvoice.filename }),
            ...(providerInvoice.public_file_url != null && { public_file_url: providerInvoice.public_file_url }),
            ...(providerInvoice.remaining_amount_with_tax != null && { remaining_amount_with_tax: providerInvoice.remaining_amount_with_tax }),
            ...(providerInvoice.remaining_amount_without_tax != null && { remaining_amount_without_tax: providerInvoice.remaining_amount_without_tax }),
            ...(providerInvoice.ledger_entry != null && { ledger_entry_id: providerInvoice.ledger_entry.id }),
            ...(providerInvoice.supplier != null && {
                supplier_id: providerInvoice.supplier.id,
                supplier_url: providerInvoice.supplier.url
            }),
            ...(providerInvoice.invoice_lines != null && { invoice_lines_url: providerInvoice.invoice_lines.url }),
            ...(providerInvoice.categories != null && { categories_url: providerInvoice.categories.url }),
            ...(providerInvoice.transaction_reference != null && { transaction_reference: providerInvoice.transaction_reference }),
            payment_status: providerInvoice.payment_status,
            paid: providerInvoice.paid,
            ...(providerInvoice.payments != null && { payments_url: providerInvoice.payments.url }),
            ...(providerInvoice.matched_transactions != null && { matched_transactions_url: providerInvoice.matched_transactions.url }),
            external_reference: providerInvoice.external_reference,
            ...(providerInvoice.e_invoicing != null && {
                ...(providerInvoice.e_invoicing.status != null && { e_invoicing_status: providerInvoice.e_invoicing.status }),
                ...(providerInvoice.e_invoicing.reason != null && { e_invoicing_reason: providerInvoice.e_invoicing.reason })
            }),
            ...(providerInvoice.archived_at != null && { archived_at: providerInvoice.archived_at }),
            created_at: providerInvoice.created_at,
            updated_at: providerInvoice.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
