import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The ID of the draft invoice to delete. Example: "inv:0-..."'),
    version: z.number().int().optional().describe('The version of the invoice to delete. If omitted, the latest version is deleted.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a draft invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_WRITE', 'INVOICES_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.squareup.com/reference/square/invoices-api/delete-invoice
        await nango.delete({
            endpoint: `/v2/invoices/${encodeURIComponent(input.invoice_id)}`,
            ...(input.version !== undefined && { params: { version: input.version } }),
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
