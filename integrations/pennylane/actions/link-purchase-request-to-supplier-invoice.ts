import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_invoice_id: z.number().int().positive().describe('Supplier invoice ID. Example: 25465510096896'),
    purchase_request_id: z.number().int().positive().describe('Purchase request ID to link. Example: 3094925312')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Link one purchase request to a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/postsupplierinvoicelinkedpurchaserequests
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(String(input.supplier_invoice_id))}/linked_purchase_requests`,
            data: {
                purchase_request_id: input.purchase_request_id
            },
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, received ${response.status}`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
