import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ order_id: z.string() });
const OutputSchema = z.object({ messages: z.array(z.record(z.string(), z.unknown())) });

const action = createAction({
    description: 'Get messages for a marketplace order.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/orders/messages', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-list-order-messages
        const response = await nango.get({
            endpoint: `/marketplace/orders/${encodeURIComponent(input.order_id)}/messages`,
            retries: 3
        });

        const messages = z.array(z.record(z.string(), z.unknown())).parse(response.data?.messages ?? []);
        return { messages };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
