import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer invoice ID. Example: 25461862449152')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number()
});

const action = createAction({
    description: 'Delete a draft customer invoice or draft credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/delete_customer_invoices-id
        await nango.delete({
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
