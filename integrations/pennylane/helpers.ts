import type { CreateInvoice, CreateProduct, NangoAction } from '../models.js';

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

export function validateInvoiceInput(input: CreateInvoice, nango: NangoAction) {
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

export function validateCreateProduct(input: CreateProduct, nango: NangoAction) {
    if (!input.label) {
        throw new nango.ActionError({
            message: 'label is a required field'
        });
    }

    if (!input.unit) {
        throw new nango.ActionError({
            message: 'unit is a required field'
        });
    }

    if (!input.price) {
        throw new nango.ActionError({
            message: 'price is a required field'
        });
    }

    if (!input.vat_rate) {
        throw new nango.ActionError({
            message: 'vat_rate is a required field'
        });
    }

    if (!input.currency) {
        throw new nango.ActionError({
            message: 'currency is a required field'
        });
    }

    if (!input.source_id) {
        throw new nango.ActionError({
            message: 'source_id is a required field'
        });
    }
}
