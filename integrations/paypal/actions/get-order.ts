import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The PayPal order ID. Example: "8A79039013362943U"')
});

const ProviderOrderSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        intent: z.string().optional(),
        purchase_units: z.array(z.object({}).passthrough()).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional(),
        links: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an order.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderOrderSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProviderOrderSchema>> => {
        const response = await nango.get({
            // https://developer.paypal.com/api/orders/v2/#orders_get
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const order = ProviderOrderSchema.parse(response.data);
        return order;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
