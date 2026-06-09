import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('Unique identifier of the invoice. Example: "260815000000101011"'),
    organization_id: z.string().describe('ID of the organization. Example: "927270289"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Mark a Zoho Books invoice as sent',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/mark-invoice-sent',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/invoices/#mark-an-invoice-as-sent
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}/status/sent`,
            params: {
                organization_id: input.organization_id
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
