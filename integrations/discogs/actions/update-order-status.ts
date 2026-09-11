import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ order_id: z.string(), status: z.string() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Update the status of a marketplace order.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/orders/status', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-edit-order
        const response = await nango.post({
            endpoint: `/marketplace/orders/${encodeURIComponent(input.order_id)}`,
            data: { status: input.status },
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
