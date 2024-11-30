import type { NangoAction, PennylaneSuccessResponse, UpdateInvoice, UpdateInvoiceResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: UpdateInvoice): Promise<PennylaneSuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'id (invoice source_id) is a required field'
        });
    }

    type invoiceUpdate = Omit<UpdateInvoice, 'id'>;
    const { id, ...rest } = input;
    const invoiceData: invoiceUpdate = { ...rest };

    const postData = {
        invoice: {
            ...invoiceData
        }
    };

    const { data } = await nango.put<UpdateInvoiceResponse>({
        // https://pennylane.readme.io/reference/putexternalapiv1customerinvoices-1
        endpoint: `/api/external/v1/customer_invoices/${id}`,
        data: postData,
        retries: 10
    });

    return {
        success: true,
        source_id: data.invoice.id
    };
}
