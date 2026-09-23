import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the customer to delete.')
    })
    .describe('Input for deleting a customer.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a customer from the provider.
 * @pitfalls: Deleting a non-existent customer returns 200 instead of 404, and customers with non-zero total_spent or orders_count cannot be deleted and will result in 422.
 */
const action = createAction({
    description: 'Delete a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('A null response indicating successful deletion.'),
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<null> => {
        const response = await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer/delete-customer
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.id)}.json`,
            retries: 1
        });

        if (response.status === 422) {
            const data = response.data;
            if (data && typeof data === 'object' && 'error' in data) {
                throw new nango.ActionError({
                    type: 'deletion_blocked',
                    message: String(data.error)
                });
            }
            throw new nango.ActionError({
                type: 'deletion_blocked',
                message: 'Customer cannot be deleted. Customers with order history are not removable.'
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
