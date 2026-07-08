import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.string().describe('Customer invoice ID. Example: "25465638002688"'),
    transaction_id: z.string().describe('Transaction ID. Example: "25471101403136"')
});

const OutputSchema = z.object({
    customer_invoice_id: z.string(),
    transaction_id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Match one bank transaction to a customer invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const customerInvoiceId = input.customer_invoice_id;
        const transactionId = Number(input.transaction_id);

        if (!Number.isFinite(transactionId) || !Number.isInteger(transactionId)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'transaction_id must be a valid integer'
            });
        }

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/postcustomerinvoicematchedtransactions
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(customerInvoiceId)}/matched_transactions`,
            data: {
                transaction_id: transactionId
            },
            retries: 3
        };

        await nango.post(config);

        return {
            customer_invoice_id: customerInvoiceId,
            transaction_id: input.transaction_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
