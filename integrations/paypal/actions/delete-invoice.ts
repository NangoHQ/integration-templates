import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the draft invoice to delete. Example: "INV2-CDNR-4VJ3-R9L3-CKGP"')
});

const OutputSchema = z.object({
    invoice_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a draft invoice that has not yet been sent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/invoicing/invoices/readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.paypal.com/api/invoicing/v2/#invoices_delete
            endpoint: `/v2/invoicing/invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content but received ${response.status}`,
                invoice_id: input.invoice_id
            });
        }

        return {
            invoice_id: input.invoice_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
