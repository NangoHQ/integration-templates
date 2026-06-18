import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('Order ID. Example: 100')
});

const ProviderOrderSchema = z
    .object({
        id: z.number(),
        customer_id: z.number().optional(),
        status: z.string().optional(),
        status_id: z.number().optional(),
        total_inc_tax: z.string().optional(),
        total_ex_tax: z.string().optional(),
        subtotal_inc_tax: z.string().optional(),
        subtotal_ex_tax: z.string().optional(),
        items_total: z.number().optional(),
        items_shipped: z.number().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderOrderSchema;

const action = createAction({
    description: 'Retrieve an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = String(input.order_id);

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/orders#get-an-order
            endpoint: `/v2/orders/${encodeURIComponent(orderId)}`,
            retries: 3
        });

        if (response.status === 204) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found'
            });
        }

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return providerOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
