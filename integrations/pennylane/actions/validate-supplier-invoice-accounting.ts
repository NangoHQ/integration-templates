import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the supplier invoice to validate. Example: "12345"')
});

const ProviderSupplierInvoiceSchema = z
    .object({
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
        ledger_entry: z.object({ id: z.number() }).nullable().optional(),
        supplier: z.object({ id: z.number(), url: z.string() }).nullable().optional(),
        invoice_lines: z.object({ url: z.string() }).optional(),
        categories: z.object({ url: z.string() }).optional(),
        transaction_reference: z
            .object({
                banking_provider: z.string(),
                provider_field_name: z.string(),
                provider_field_value: z.string()
            })
            .nullable()
            .optional(),
        payment_status: z.string(),
        paid: z.boolean(),
        payments: z.object({ url: z.string() }).optional(),
        matched_transactions: z.object({ url: z.string() }).optional(),
        external_reference: z.string(),
        e_invoicing: z
            .object({
                status: z.string().nullable().optional(),
                reason: z.string().nullable().optional(),
                flow: z.object({ id: z.string() }).nullable().optional(),
                source_file_url: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        archived_at: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

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
    ledger_entry: z.object({ id: z.number() }).optional(),
    supplier: z.object({ id: z.number(), url: z.string() }).optional(),
    invoice_lines: z.object({ url: z.string() }).optional(),
    categories: z.object({ url: z.string() }).optional(),
    transaction_reference: z
        .object({
            banking_provider: z.string(),
            provider_field_name: z.string(),
            provider_field_value: z.string()
        })
        .optional(),
    payment_status: z.string(),
    paid: z.boolean(),
    payments: z.object({ url: z.string() }).optional(),
    matched_transactions: z.object({ url: z.string() }).optional(),
    external_reference: z.string(),
    e_invoicing: z
        .object({
            status: z.string().optional(),
            reason: z.string().optional(),
            flow: z.object({ id: z.string() }).optional(),
            source_file_url: z.string().optional()
        })
        .optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Validate accounting for a supplier invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/validateaccountingsupplierinvoice
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.id)}/validate_accounting`,
            retries: 1
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected response.'
            });
        }

        const providerInvoice = ProviderSupplierInvoiceSchema.parse(raw);

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
            ...(providerInvoice.ledger_entry != null && { ledger_entry: providerInvoice.ledger_entry }),
            ...(providerInvoice.supplier != null && { supplier: providerInvoice.supplier }),
            ...(providerInvoice.invoice_lines != null && { invoice_lines: providerInvoice.invoice_lines }),
            ...(providerInvoice.categories != null && { categories: providerInvoice.categories }),
            ...(providerInvoice.transaction_reference != null && { transaction_reference: providerInvoice.transaction_reference }),
            payment_status: providerInvoice.payment_status,
            paid: providerInvoice.paid,
            ...(providerInvoice.payments != null && { payments: providerInvoice.payments }),
            ...(providerInvoice.matched_transactions != null && { matched_transactions: providerInvoice.matched_transactions }),
            external_reference: providerInvoice.external_reference,
            ...(providerInvoice.e_invoicing != null && {
                e_invoicing: {
                    ...(providerInvoice.e_invoicing.status != null && { status: providerInvoice.e_invoicing.status }),
                    ...(providerInvoice.e_invoicing.reason != null && { reason: providerInvoice.e_invoicing.reason }),
                    ...(providerInvoice.e_invoicing.flow != null && { flow: providerInvoice.e_invoicing.flow }),
                    ...(providerInvoice.e_invoicing.source_file_url != null && { source_file_url: providerInvoice.e_invoicing.source_file_url })
                }
            }),
            ...(providerInvoice.archived_at != null && { archived_at: providerInvoice.archived_at }),
            created_at: providerInvoice.created_at,
            updated_at: providerInvoice.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
