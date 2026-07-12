import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_invoice_id: z.number().describe('Supplier invoice ID. Example: 25467524694016'),
    transaction_id: z.number().describe('Transaction ID to match to the supplier invoice. Example: 25472688783360')
});

const OutputSchema = z.object({
    success: z.boolean(),
    supplier_invoice_id: z.number(),
    transaction_id: z.number()
});

const action = createAction({
    description: 'Match one bank transaction to a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/postsupplierinvoicematchedtransactions
        await nango.post({
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(String(input.supplier_invoice_id))}/matched_transactions`,
            data: {
                transaction_id: input.transaction_id
            },
            retries: 10
        });

        return {
            success: true,
            supplier_invoice_id: input.supplier_invoice_id,
            transaction_id: input.transaction_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
