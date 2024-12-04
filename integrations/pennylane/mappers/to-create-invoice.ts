import type { CreateInvoice, InvoiceMapper } from '../../models.js';

export function mapInvoice(input: CreateInvoice): InvoiceMapper {
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
            currency: input.currency!,
            line_items: input?.line_items ?? [],
            pdf_invoice_free_text: input.pdf_invoice_free_text ?? '',
            pdf_invoice_subject: input.pdf_invoice_subject ?? '',
            special_mention: input.special_mention ?? null,
            discount: input.discount ?? 0,
            categories: input.categories ?? [],
            ...(input.transactions_reference && {
                transactions_reference: {
                    banking_provider: input.transactions_reference.banking_provider ?? '',
                    provider_field_name: input.transactions_reference.provider_field_name ?? '',
                    provider_field_value: input.transactions_reference.provider_field_value ?? ''
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
