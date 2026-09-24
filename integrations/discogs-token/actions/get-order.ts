import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ order_id: z.string() });
const OutputSchema = z.record(z.string(), z.unknown());

function isNotFound(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    if ('status' in err && err.status === 404) return true;
    if ('response' in err) {
        const response = err.response;
        return typeof response === 'object' && response !== null && 'status' in response && response.status === 404;
    }
    return false;
}

const action = createAction({
    description: 'Get a marketplace order by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/orders/get', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx status codes.
        // We catch 404 to convert it into a structured not-found ActionError.
        try {
            response = await nango.get({
                // https://www.discogs.com/developers#page:marketplace,header-marketplace-order
                endpoint: `/marketplace/orders/${encodeURIComponent(input.order_id)}`,
                retries: 3
            });
        } catch (err: unknown) {
            if (isNotFound(err)) {
                throw new nango.ActionError({ type: 'not_found', message: 'Order not found', order_id: input.order_id });
            }
            throw err;
        }

        if (!response.data) {
            throw new nango.ActionError({ type: 'not_found', message: 'Order not found', order_id: input.order_id });
        }

        return z.record(z.string(), z.unknown()).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
