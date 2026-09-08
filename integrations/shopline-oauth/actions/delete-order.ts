import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the order to delete. Example: "21076844526136228945554554"')
    })
    .describe('Input parameters for permanently deleting an order.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an order from the provider and cannot be undone.
 */
const action = createAction({
    description: 'Permanently delete an order.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the order was successfully deleted.'),
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/order-delete-order
        await nango.delete({
            endpoint: `/admin/openapi/v20260601/orders/${encodeURIComponent(input.id)}.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
