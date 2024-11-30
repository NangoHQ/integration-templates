import type { CreateInvoice, InvoiceResponse, NangoAction, PennylaneSuccessResponse, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoAction, input: CreateInvoice): Promise<PennylaneSuccessResponse> {
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

    if (input.language && !['fr_FR, en_GB'].includes(input.language)) {
        input = { ...input, language: 'fr_FR' };
    }
    const customerInvoice = {
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

    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customer_invoices-post-1
        endpoint: '/api/external/v1/customer_invoices',
        data: customerInvoice,
        retries: 10
    };

    const { data } = await nango.post<InvoiceResponse>(config);
    return {
        success: true,
        source_id: data.invoice.id
    };
}
