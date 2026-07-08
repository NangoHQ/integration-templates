import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.number().describe('Customer invoice ID. Example: 25461646082048'),
    transaction_id: z.number().describe('Transaction ID to unmatch. Example: 12345')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Unmatch a bank transaction from a customer invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/deletecustomerinvoicematchedtransactions
        await nango.delete({
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.customer_invoice_id)}/matched_transactions/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
