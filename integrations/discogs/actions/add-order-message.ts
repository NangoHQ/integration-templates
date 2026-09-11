import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ order_id: z.string(), message: z.string(), status: z.string().optional() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Add a message to a marketplace order.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/orders/messages', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const data: Record<string, string> = { message: input.message };
        if (input.status !== undefined) data['status'] = input.status;

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-add-new-order-message
        const response = await nango.post({
            endpoint: `/marketplace/orders/${encodeURIComponent(input.order_id)}/messages`,
            data,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
