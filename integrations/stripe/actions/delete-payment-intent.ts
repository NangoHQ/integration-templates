import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    payment_intent_id: z.string().describe('The ID of the PaymentIntent to cancel. Example: "pi_3TbSopEZpD6kXrae1ZIp2rzC"')
});

const ProviderPaymentIntentSchema = z.object({
    id: z.string(),
    object: z.string(),
    amount: z.number().optional(),
    amount_capturable: z.number().optional(),
    amount_received: z.number().optional(),
    canceled_at: z.number().nullable().optional(),
    cancellation_reason: z.string().nullable().optional(),
    capture_method: z.string().optional(),
    client_secret: z.string().nullable().optional(),
    confirmation_method: z.string().optional(),
    created: z.number().optional(),
    currency: z.string().optional(),
    customer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    latest_charge: z.string().nullable().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    payment_method: z.string().nullable().optional(),
    receipt_email: z.string().nullable().optional(),
    status: z.string(),
    transfer_group: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    canceled_at: z.number().optional(),
    cancellation_reason: z.string().optional()
});

const action = createAction({
    description: 'Cancel a Stripe PaymentIntent.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-payment-intent',
        group: 'Payment Intents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.stripe.com/api/payment_intents/cancel
            endpoint: `/v1/payment_intents/${encodeURIComponent(input.payment_intent_id)}/cancel`,
            retries: 3
        });

        const providerPaymentIntent = ProviderPaymentIntentSchema.parse(response.data);

        return {
            id: providerPaymentIntent.id,
            status: providerPaymentIntent.status,
            ...(providerPaymentIntent.canceled_at != null && { canceled_at: providerPaymentIntent.canceled_at }),
            ...(providerPaymentIntent.cancellation_reason != null && { cancellation_reason: providerPaymentIntent.cancellation_reason })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
