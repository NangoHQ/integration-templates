import type { CreateInvoice, InvoiceResponse, NangoAction, PennylaneSuccessResponse, ProxyConfiguration } from '../../models.js';
import { validateInvoiceInput } from '../helpers.js';
import { createInvoice } from '../mappers/createInvoice.js';

export default async function runAction(nango: NangoAction, input: CreateInvoice): Promise<PennylaneSuccessResponse> {
    validateInvoiceInput(input, nango);

    if (input.language && !['fr_FR, en_GB'].includes(input.language)) {
        input = { ...input, language: 'en_GB' };
    }

    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customer_invoices-post-1
        endpoint: '/api/external/v1/customer_invoices',
        data: createInvoice(input),
        retries: 10
    };

    const { data } = await nango.post<InvoiceResponse>(config);
    return {
        success: true,
        source_id: data.invoice.id
    };
}
