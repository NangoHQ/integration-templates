import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of the customer invoice. Example: 42')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Mark a customer invoice as paid without automatic reconciliation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/markaspaidcustomerinvoice.md
        const response = await nango.put({
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}/mark_as_paid`,
            retries: 3
        });

        if (response.status === 204) {
            return {
                id: input.id,
                success: true
            };
        }

        if (response.status === 422) {
            const errorBody = z
                .object({
                    error: z.string().optional(),
                    status: z.number().optional()
                })
                .safeParse(response.data);

            throw new nango.ActionError({
                type: 'unprocessable',
                message: errorBody.success && errorBody.data.error ? errorBody.data.error : 'Invoice cannot be marked as paid',
                invoice_id: input.id
            });
        }

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer invoice not found',
                invoice_id: input.id
            });
        }

        throw new nango.ActionError({
            type: 'unexpected',
            message: `Unexpected status ${response.status} when marking invoice as paid`,
            invoice_id: input.id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
