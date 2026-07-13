import { z } from 'zod';
import { createAction } from 'nango';

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('The PayPal order ID. Example: "8A79039013362943U"'),
    payment_source: z
        .record(z.string(), z.unknown())
        .describe('The payment source definition. Example: {"paypal":{"experience_context":{"return_url":"https://example.com/return"}}}'),
    application_context: z.record(z.string(), z.unknown()).optional().describe('Customizes the payer confirmation experience.')
});

const OutputSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        intent: z.string().optional(),
        payment_source: z.record(z.string(), z.unknown()).optional(),
        purchase_units: z.array(z.record(z.string(), z.unknown())).optional(),
        links: z.array(LinkSchema).optional(),
        payer: z.record(z.string(), z.unknown()).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Confirm the payment source for an order to move it toward payer approval, used in server-driven checkout integrations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['openid'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/orders/v2/#orders_confirm-payment-source
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.id)}/confirm-payment-source`,
            data: {
                payment_source: input.payment_source,
                ...(input.application_context !== undefined && { application_context: input.application_context })
            },
            retries: 3
        });

        const order = OutputSchema.parse(response.data);
        return order;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
