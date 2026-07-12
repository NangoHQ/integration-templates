import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_invoice_id: z.number().describe('Supplier invoice identifier. Example: 25465885929472'),
    payment_status: z.enum(['paid', 'to_be_paid']).describe('New payment status. Allowed values: paid, to_be_paid')
});

const OutputSchema = z.object({
    supplier_invoice_id: z.number(),
    payment_status: z.enum(['paid', 'to_be_paid'])
});

const action = createAction({
    description: 'Update a supplier invoice payment status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/updatesupplierinvoicepaymentstatus
        const response = await nango.put({
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.supplier_invoice_id)}/payment_status`,
            data: {
                payment_status: input.payment_status
            },
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: `Unexpected status ${response.status} when updating supplier invoice payment status.`,
                supplier_invoice_id: input.supplier_invoice_id,
                payment_status: input.payment_status
            });
        }

        return {
            supplier_invoice_id: input.supplier_invoice_id,
            payment_status: input.payment_status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
