import type { CreateInvoice, InvoiceResponse, NangoAction, PennylaneSuccessResponse, ProxyConfiguration } from '../../models.js';
import { createInvoice } from '../helpers.js';

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

    if (input.language && !['fr_FR, en_GB'].includes(input.language)) {
        input = { ...input, language: 'en_GB' };
    }

    const customerInvoice = createInvoice(input);

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
