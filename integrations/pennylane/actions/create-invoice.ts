import type { CreateInvoice, InvoiceResponse, NangoAction, PennylaneSuccessResponse, ProxyConfiguration } from '../../models.js';
import { mapInvoice } from '../mappers/to-create-invoice.js';
import { validateInvoiceInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateInvoice): Promise<PennylaneSuccessResponse> {
    const parsedInput = validateInvoiceInputSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create an invoice: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create an invoice'
        });
    }
    if (input.language && !['fr_FR, en_GB'].includes(input.language)) {
        input = { ...input, language: 'en_GB' };
    }

    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customer_invoices-post-1
        endpoint: '/api/external/v1/customer_invoices',
        data: mapInvoice(input),
        retries: 10
    };

    const { data } = await nango.post<InvoiceResponse>(config);
    return {
        success: true,
        source_id: data.invoice.id
    };
}
