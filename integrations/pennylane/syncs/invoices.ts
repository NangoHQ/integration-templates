import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BillingSubscriptionSchema = z.object({
    id: z.union([z.string(), z.null()]).optional()
});

const TransactionReferenceSchema = z.object({
    banking_provider: z.union([z.string(), z.null()]),
    provider_field_name: z.union([z.string(), z.null()]),
    provider_field_value: z.union([z.string(), z.null()])
});

const ImputationDateSchema = z.object({
    start_date: z.string(),
    end_date: z.string()
});

const DeliveryAddressSchema = z.object({
    address: z.string().optional(),
    postal_code: z.union([z.string(), z.null()]).optional(),
    city: z.union([z.string(), z.null()]).optional(),
    country_alpha2: z.union([z.string(), z.null()]).optional()
});

const CustomerSchema = z.object({
    customer_type: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    country_alpha2: z.string().optional(),
    gender: z.union([z.string(), z.null()]).optional(),
    address: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    source_id: z.string().optional(),
    emails: z.string().array().optional(),
    billing_iban: z.string().optional(),
    delivery_address: z.union([z.string(), DeliveryAddressSchema]).optional(),
    vat_number: z.union([z.string(), z.null()]).optional(),
    delivery_postal_code: z.string().optional(),
    delivery_city: z.string().optional(),
    delivery_country_alpha2: z.string().optional(),
    payment_conditions: z.string().optional(),
    phone: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    mandate: z
        .object({
            provider: z.string().optional(),
            source_id: z.string()
        })
        .optional(),
    plan_item: z
        .object({
            number: z.string().optional(),
            label: z.string().optional(),
            enabled: z.boolean().optional(),
            vat_rate: z.string().optional(),
            country_alpha2: z.string().optional(),
            description: z.string().optional()
        })
        .optional()
});

const InvoiceLineItemSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional(),
    unit: z.union([z.string(), z.null()]).optional(),
    quantity: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    description: z.string().optional(),
    product_id: z.union([z.string(), z.null()]).optional(),
    vat_rate: z.string().optional(),
    currency_price_before_tax: z.string().optional(),
    currency_tax: z.string().optional(),
    raw_currency_unit_price: z.string().optional(),
    discount: z.string().optional(),
    discount_type: z.string().optional(),
    section_rank: z.union([z.number(), z.null()]).optional(),
    v2_id: z.union([z.number(), z.null()]).optional(),
    product_v2_id: z.union([z.number(), z.null()]).optional()
});

const InvoiceCategorySchema = z.object({
    source_id: z.string(),
    weight: z.string(),
    label: z.string(),
    direction: z.union([z.string(), z.null()]),
    created_at: z.union([z.date(), z.string()]),
    updated_at: z.union([z.date(), z.string()])
});

const MatchedTransactionsSchema = z.object({
    label: z.union([z.string(), z.null()]),
    amount: z.union([z.string(), z.null()]),
    group_uuid: z.union([z.string(), z.null()]),
    date: z.union([z.date(), z.null()]),
    fee: z.union([z.string(), z.null()]),
    currency: z.string()
});

const LineItemsSectionsAttributesSchema = z.object({
    title: z.union([z.string(), z.null()]).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    rank: z.number()
});

const RawInvoiceSchema = z.object({
    id: z.union([z.number(), z.string()]),
    label: z.union([z.string(), z.null()]).optional(),
    invoice_number: z.union([z.string(), z.null()]).optional(),
    currency: z.union([z.string(), z.null()]).optional(),
    amount: z.union([z.string(), z.null()]).optional(),
    currency_amount: z.union([z.string(), z.null()]).optional(),
    currency_amount_before_tax: z.union([z.string(), z.null()]).optional(),
    tax: z.union([z.string(), z.null()]).optional(),
    currency_tax: z.union([z.string(), z.null()]).optional(),
    remaining_amount_with_tax: z.union([z.string(), z.null()]).optional(),
    remaining_amount_without_tax: z.union([z.string(), z.null()]).optional(),
    draft: z.boolean().optional(),
    language: z.union([z.string(), z.null()]).optional(),
    paid: z.boolean().optional(),
    status: z.union([z.string(), z.null()]).optional(),
    filename: z.union([z.string(), z.null()]).optional(),
    date: z.string().optional(),
    deadline: z.union([z.string(), z.null()]).optional(),
    special_mention: z.union([z.string(), z.null()]).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    archived_at: z.union([z.string(), z.null()]).optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_description: z.union([z.string(), z.null()]).optional(),
    pdf_invoice_subject: z.string().optional(),
    public_file_url: z.union([z.string(), z.null()]).optional(),
    exchange_rate: z.union([z.string(), z.null()]).optional(),
    discount: z.union([z.object({ type: z.string(), value: z.string() }), z.null()]).optional(),
    ledger_entry: z.object({ id: z.union([z.number(), z.string()]) }).optional(),
    customer_invoice_template: z.unknown().nullable().optional(),
    transaction_reference: z.unknown().nullable().optional(),
    customer: z
        .object({
            id: z.union([z.number(), z.string()]),
            url: z.string().optional()
        })
        .optional(),
    billing_subscription: z.unknown().nullable().optional(),
    credited_invoice: z.unknown().nullable().optional(),
    quote: z.unknown().nullable().optional(),
    invoice_line_sections: z.object({ url: z.string() }).nullable().optional(),
    invoice_lines: z.object({ url: z.string() }).nullable().optional(),
    custom_header_fields: z.object({ url: z.string() }).nullable().optional(),
    categories: z.object({ url: z.string() }).nullable().optional(),
    payments: z.object({ url: z.string() }).nullable().optional(),
    matched_transactions: z.object({ url: z.string() }).nullable().optional(),
    appendices: z.object({ url: z.string() }).nullable().optional(),
    external_reference: z.string().optional(),
    e_invoicing: z.unknown().nullable().optional(),
    factur_x: z.boolean().optional()
});

const InvoiceSchema = z.object({
    id: z.string(),
    amount: z.union([z.string(), z.null()]),
    billing_subscription: z.union([BillingSubscriptionSchema, z.null()]).optional(),
    categories: z.union([InvoiceCategorySchema.array(), z.null()]).optional(),
    currency: z.union([z.string(), z.null()]),
    currency_amount: z.union([z.string(), z.null()]),
    currency_amount_before_tax: z.union([z.string(), z.null()]).optional(),
    currency_tax: z.union([z.string(), z.null()]),
    customer: CustomerSchema.optional(),
    customer_name: z.string(),
    customer_validation_needed: z.union([z.boolean(), z.null()]),
    date: z.union([z.date(), z.string()]).optional(),
    deadline: z.union([z.string(), z.null()]),
    discount: z.union([z.string(), z.null()]),
    discount_type: z.union([z.string(), z.null()]).optional(),
    exchange_rate: z.union([z.number(), z.null()]),
    file_url: z.union([z.string(), z.null()]),
    filename: z.union([z.string(), z.null()]),
    fully_paid_at: z.union([z.date(), z.null()]).optional(),
    imputation_dates: z.union([ImputationDateSchema, z.null()]),
    invoice_number: z.union([z.string(), z.null()]).optional(),
    is_draft: z.boolean(),
    is_estimate: z.boolean().optional(),
    label: z.union([z.string(), z.null()]).optional(),
    language: z.union([z.string(), z.null()]).optional(),
    line_items: InvoiceLineItemSchema.array(),
    line_items_sections_attributes: LineItemsSectionsAttributesSchema.array(),
    matched_transactions: MatchedTransactionsSchema.array(),
    paid: z.boolean(),
    payments: z.object({}).array(),
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    public_url: z.union([z.string(), z.null()]),
    quote_group_uuid: z.union([z.string(), z.null()]).optional(),
    remaining_amount: z.union([z.string(), z.null()]),
    source: z.union([z.string(), z.null()]),
    special_mention: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    transactions_reference: z.union([TransactionReferenceSchema, z.null()]).optional(),
    updated_at: z.union([z.date(), z.string()])
});

const CheckpointSchema = z.object({
    last_id: z.string()
});

function toInvoice(raw: z.infer<typeof RawInvoiceSchema>): z.infer<typeof InvoiceSchema> {
    const exchangeRate = raw.exchange_rate != null ? parseFloat(raw.exchange_rate) : null;
    const discountValue = raw.discount && typeof raw.discount === 'object' && 'value' in raw.discount ? raw.discount.value : null;
    const discountType = raw.discount && typeof raw.discount === 'object' && 'type' in raw.discount ? raw.discount.type : null;

    return {
        id: String(raw.id),
        label: raw.label ?? '',
        invoice_number: raw.invoice_number ?? '',
        quote_group_uuid: null,
        is_draft: raw.draft ?? false,
        is_estimate: false,
        currency: raw.currency ?? null,
        amount: raw.amount ?? '',
        currency_amount: raw.currency_amount ?? '',
        currency_amount_before_tax: raw.currency_amount_before_tax ?? '',
        exchange_rate: exchangeRate,
        date: raw.date ?? '',
        deadline: raw.deadline ?? null,
        currency_tax: raw.currency_tax ?? '',
        language: raw.language ?? '',
        paid: raw.paid ?? false,
        fully_paid_at: null,
        status: raw.status ?? null,
        discount: discountValue ?? '',
        discount_type: discountType ?? '',
        public_url: raw.public_file_url ?? '',
        file_url: null,
        filename: raw.filename ?? null,
        remaining_amount: raw.remaining_amount_with_tax ?? '',
        source: '',
        special_mention: raw.special_mention ?? null,
        customer_validation_needed: null,
        updated_at: raw.updated_at ?? '',
        imputation_dates: null,
        customer_name: '',
        line_items_sections_attributes: [],
        line_items: [],
        categories: [],
        transactions_reference: null,
        payments: [],
        matched_transactions: [],
        pdf_invoice_free_text: raw.pdf_invoice_free_text ?? '',
        pdf_invoice_subject: raw.pdf_invoice_subject ?? '',
        billing_subscription: raw.billing_subscription ?? null,
        customer: undefined
    };
}

const sync = createSync({
    description: 'Fetches a list of customer invoices from pennylane',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['customer_invoices'],
    metadata: z.object({}),

    models: {
        PennylaneInvoice: InvoiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const lastId = checkpoint.success ? checkpoint.data.last_id : undefined;

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcustomerinvoices
            endpoint: '/api/external/v2/customer_invoices',
            retries: 3,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 50
            }
        };

        config.params = {
            sort: 'id',
            ...(lastId && { filter: JSON.stringify([{ field: 'id', operator: 'gt', value: lastId }]) })
        };

        for await (const page of nango.paginate(config)) {
            const items = Array.isArray(page) ? page : [];
            const invoices = items.map((item: unknown) => {
                const parsed = RawInvoiceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse invoice: ${parsed.error.message}`);
                }
                return toInvoice(parsed.data);
            });

            if (invoices.length > 0) {
                await nango.batchSave(invoices, 'PennylaneInvoice');
                const lastInvoice = invoices[invoices.length - 1];
                if (lastInvoice) {
                    await nango.saveCheckpoint({ last_id: lastInvoice.id });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
