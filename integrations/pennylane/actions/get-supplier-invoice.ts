import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Supplier invoice identifier. Example: 25465510096896')
});

const ProviderSupplierInvoiceSchema = z.object({
    id: z.number(),
    amount: z.string(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    currency_amount_before_tax: z.string(),
    currency_amount: z.string(),
    currency_tax: z.string(),
    currency: z.string(),
    date: z.string(),
    deadline: z.string(),
    filename: z.string(),
    invoice_number: z.string(),
    label: z.string(),
    payment_status: z.string(),
    paid: z.boolean(),
    remaining_amount_with_tax: z.string(),
    remaining_amount_without_tax: z.string(),
    tax: z.string(),
    updated_at: z.string(),
    reconciled: z.boolean(),
    public_file_url: z.string(),
    exchange_rate: z.string(),
    accounting_status: z.string(),
    ledger_entry: z.object({
        id: z.number()
    }),
    transaction_reference: z.string().nullable(),
    supplier: z.object({
        id: z.number(),
        url: z.string()
    }),
    invoice_lines: z.object({
        url: z.string()
    }),
    categories: z.object({
        url: z.string()
    }),
    payments: z.object({
        url: z.string()
    }),
    matched_transactions: z.object({
        url: z.string()
    }),
    external_reference: z.string(),
    e_invoicing: z.unknown().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    amount: z.string(),
    created_at: z.string(),
    currency_amount_before_tax: z.string(),
    currency_amount: z.string(),
    currency_tax: z.string(),
    currency: z.string(),
    date: z.string(),
    deadline: z.string(),
    filename: z.string(),
    invoice_number: z.string(),
    label: z.string(),
    payment_status: z.string(),
    paid: z.boolean(),
    remaining_amount_with_tax: z.string(),
    remaining_amount_without_tax: z.string(),
    tax: z.string(),
    updated_at: z.string(),
    reconciled: z.boolean(),
    public_file_url: z.string(),
    exchange_rate: z.string(),
    accounting_status: z.string(),
    ledger_entry_id: z.number(),
    transaction_reference: z.string().optional(),
    supplier_id: z.number(),
    supplier_url: z.string(),
    invoice_lines_url: z.string(),
    categories_url: z.string(),
    payments_url: z.string(),
    matched_transactions_url: z.string(),
    external_reference: z.string(),
    e_invoicing: z.unknown().optional(),
    archived_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsupplierinvoice
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Supplier invoice not found',
                id: input.id
            });
        }

        const providerInvoice = ProviderSupplierInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            amount: providerInvoice.amount,
            created_at: providerInvoice.created_at,
            currency_amount_before_tax: providerInvoice.currency_amount_before_tax,
            currency_amount: providerInvoice.currency_amount,
            currency_tax: providerInvoice.currency_tax,
            currency: providerInvoice.currency,
            date: providerInvoice.date,
            deadline: providerInvoice.deadline,
            filename: providerInvoice.filename,
            invoice_number: providerInvoice.invoice_number,
            label: providerInvoice.label,
            payment_status: providerInvoice.payment_status,
            paid: providerInvoice.paid,
            remaining_amount_with_tax: providerInvoice.remaining_amount_with_tax,
            remaining_amount_without_tax: providerInvoice.remaining_amount_without_tax,
            tax: providerInvoice.tax,
            updated_at: providerInvoice.updated_at,
            reconciled: providerInvoice.reconciled,
            public_file_url: providerInvoice.public_file_url,
            exchange_rate: providerInvoice.exchange_rate,
            accounting_status: providerInvoice.accounting_status,
            ledger_entry_id: providerInvoice.ledger_entry.id,
            supplier_id: providerInvoice.supplier.id,
            supplier_url: providerInvoice.supplier.url,
            invoice_lines_url: providerInvoice.invoice_lines.url,
            categories_url: providerInvoice.categories.url,
            payments_url: providerInvoice.payments.url,
            matched_transactions_url: providerInvoice.matched_transactions.url,
            external_reference: providerInvoice.external_reference,
            ...(providerInvoice.transaction_reference != null && {
                transaction_reference: providerInvoice.transaction_reference
            }),
            ...(providerInvoice.e_invoicing != null && {
                e_invoicing: providerInvoice.e_invoicing
            }),
            ...(providerInvoice.archived_at != null && {
                archived_at: providerInvoice.archived_at
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
