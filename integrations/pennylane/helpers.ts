import type {
    CreateInvoice,
    CreateSupplier,
    NangoAction,
    PennylaneCustomer,
    PennylaneIndividualCustomer,
    PennylaneInvoice,
    PennylaneSupplier
} from '../models.js';

export function toInvoice(invoice: PennylaneInvoice): PennylaneInvoice {
    return {
        id: invoice.id,
        label: invoice.label ?? '',
        invoice_number: invoice.invoice_number ?? '',
        quote_group_uuid: invoice.quote_group_uuid ?? '',
        is_draft: invoice.is_draft,
        is_estimate: invoice.is_estimate ?? false,
        currency: invoice.currency,
        amount: invoice.amount ?? '',
        currency_amount: invoice.currency_amount ?? '',
        currency_amount_before_tax: invoice.currency_amount_before_tax ?? '',
        exchange_rate: invoice?.exchange_rate ?? null,
        date: invoice.date ?? '',
        deadline: invoice.deadline ?? null,
        currency_tax: invoice.currency_tax ?? '',
        language: invoice.language ?? '',
        paid: invoice.paid,
        fully_paid_at: invoice.fully_paid_at ?? null,
        status: invoice.status ?? null,
        discount: invoice.discount ?? '',
        discount_type: invoice.discount_type ?? '',
        public_url: invoice.public_url ?? '',
        file_url: invoice.file_url ?? null,
        filename: invoice.filename ?? null,
        remaining_amount: invoice.remaining_amount ?? '',
        source: invoice.source ?? '',
        special_mention: invoice.special_mention ?? null,
        customer_validation_needed: invoice.customer_validation_needed ?? null,
        updated_at: invoice.updated_at ?? '',
        imputation_dates: invoice.imputation_dates ?? null,
        customer_name: `${invoice.customer?.first_name}` + `${invoice.customer?.last_name}`,
        line_items_sections_attributes: invoice.line_items_sections_attributes ?? [],
        line_items: invoice.line_items ?? [],
        categories: invoice.categories ?? [],
        transactions_reference: invoice?.transactions_reference ?? null,
        payments: invoice.payments ?? [],
        matched_transactions: invoice.matched_transactions ?? [],
        pdf_invoice_free_text: invoice.pdf_invoice_free_text ?? '',
        pdf_invoice_subject: invoice.pdf_invoice_subject ?? '',
        billing_subscription: invoice.billing_subscription ?? null
    };
}

export function toCustomer(customer: PennylaneIndividualCustomer): PennylaneCustomer {
    return {
        id: customer.source_id!,
        address: customer?.address ?? '',
        billing_iban: customer.billing_iban ?? '',
        city: customer?.city ?? '',
        country_alpha2: customer?.country_alpha2 ?? '',
        emails: customer.emails ?? [],
        first_name: customer?.first_name ?? '',
        last_name: customer.last_name ?? '',
        source_id: customer.source_id ?? '',
        phone: customer.phone ?? '',
        gender: customer?.gender ?? '',
        notes: customer.notes ?? '',
        postal_code: customer?.postal_code ?? '',
        delivery_postal_code: customer.postal_code ?? '',
        payment_conditions: customer.payment_conditions ?? '',
        reference: customer.reference ?? '',
        vat_number: customer.vat_number ?? null
    };
}

export function toSupplier(supplier: CreateSupplier): PennylaneSupplier {
    return {
        id: supplier.source_id!,
        address: supplier?.address ?? '',
        name: supplier.name ?? '',
        city: supplier?.city ?? '',
        country_alpha2: supplier?.country_alpha2 ?? '',
        emails: supplier.emails ?? [],
        iban: supplier.iban ?? '',
        source_id: supplier.source_id ?? '',
        phone: supplier.phone ?? '',
        notes: supplier.notes ?? '',
        postal_code: supplier?.postal_code ?? '',
        recipient: supplier.recipient ?? '',
        reg_no: supplier.reg_no ?? '',
        payment_conditions: supplier.payment_conditions ?? '',
        reference: supplier.reference ?? '',
        vat_number: supplier.vat_number ?? ''
    };
}

export function createInvoice(input: CreateInvoice) {
    return {
        create_customer: false,
        create_products: false,
        update_customer: false,
        invoice: {
            date: new Date(input.date).toISOString(),
            deadline: new Date(input.deadline).toISOString(),
            draft: input?.draft ?? true,
            customer: {
                source_id: input.customer_source_id
            },
            currency: input.currency,
            line_items: input?.line_items ?? [],
            pdf_invoice_free_text: input.pdf_invoice_free_text ?? '',
            pdf_invoice_subject: input.pdf_invoice_subject ?? '',
            special_mention: input.special_mention ?? null,
            discount: input.discount ?? 0,
            categories: input.categories ?? [],
            ...(input.transactions_reference && {
                transactions_reference: {
                    banking_provider: input.transactions_reference.banking_provider,
                    provider_field_name: input.transactions_reference.provider_field_name,
                    provider_field_value: input.transactions_reference.provider_field_value
                }
            }),
            ...(input.imputation_dates?.start_date &&
                input.imputation_dates.end_date && {
                    imputation_dates: {
                        start_date: new Date(input.imputation_dates.start_date).toISOString(),
                        end_date: new Date(input.imputation_dates.end_date).toISOString()
                    }
                })
        }
    };
}

export function validateInput(input: CreateInvoice, nango: NangoAction) {
    if (!input.date) {
        throw new nango.ActionError({
            message: 'date is a required field'
        });
    }

    if (!input.deadline) {
        throw new nango.ActionError({
            message: 'deadline is a required field'
        });
    }

    if (!input.customer_source_id) {
        throw new nango.ActionError({
            message: 'customer source_id is a required field'
        });
    }

    if (input.transactions_reference) {
        if (
            !input.transactions_reference.banking_provider ||
            !input.transactions_reference.provider_field_name ||
            !input.transactions_reference.provider_field_name
        ) {
            throw new nango.ActionError({
                message: 'banking_provider, provider_field_name and provider_field_name are required fields for transactions_reference'
            });
        }
    }

    if (input.imputation_dates) {
        if (!input.imputation_dates.start_date || !input.imputation_dates.end_date) {
            throw new nango.ActionError({
                message: 'start_date, end_date are required fields for imputation_dates'
            });
        }
    }
}
