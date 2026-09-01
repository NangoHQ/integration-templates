import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ order_id: z.string() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a marketplace order by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/orders/get', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-order
        const response = await nango.get({
            endpoint: `/marketplace/orders/${encodeURIComponent(input.order_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Order not found', order_id: input.order_id });
        }

        return z.record(z.string(), z.unknown()).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
