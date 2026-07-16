import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the invoice to retrieve. Example: "inv:0-ChClKzUTL1Ssf3Kybdil5LEXEL4I"')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.string(),
        version: z.number(),
        location_id: z.string(),
        order_id: z.string().optional(),
        primary_recipient: z
            .object({
                customer_id: z.string().optional()
            })
            .optional(),
        payment_requests: z.array(z.object({}).passthrough()).optional(),
        status: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    invoice: ProviderInvoiceSchema
});

const action = createAction({
    description: 'Retrieve an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderInvoiceSchema,
    scopes: ['INVOICES_READ'],

    exec: async (nango, input) => {
        // https://developer.squareup.com/reference/square/invoices-api/get-invoice
        const response = await nango.get({
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        });

        if (response.data === null || response.data === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected empty response from Square API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.invoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
