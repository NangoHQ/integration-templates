import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_invoice_id: z.number().describe('Supplier invoice ID. Example: 12345'),
    transaction_id: z.number().describe('Transaction ID to unmatch from the supplier invoice. Example: 67890')
});

const OutputSchema = z.object({
    success: z.boolean(),
    supplier_invoice_id: z.number(),
    transaction_id: z.number()
});

const action = createAction({
    description: 'Unmatch a bank transaction from a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://pennylane.readme.io/reference/deletesupplierinvoicematchedtransactions
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.supplier_invoice_id)}/matched_transactions/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
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
