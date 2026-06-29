import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.number().describe('Customer ID. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean(),
    customer_id: z.number()
});

const action = createAction({
    description: 'Delete a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.bigcommerce.com/docs/rest-management/customers
        const response = await nango.delete({
            endpoint: '/v3/customers',
            params: {
                'id:in': String(input.customer_id)
            },
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete customer. Unexpected status: ${response.status}`,
                customer_id: input.customer_id
            });
        }

        return {
            success: true,
            customer_id: input.customer_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
