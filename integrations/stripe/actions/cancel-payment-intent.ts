import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('PaymentIntent ID to cancel. Example: pi_xxx'),
    cancellation_reason: z.string().optional().describe('Reason for cancellation. Example: duplicate, fraudulent, requested_by_customer, abandoned')
});

const ProviderPaymentIntentSchema = z
    .object({
        id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        cancellation_reason: z.string().nullable().optional(),
        client_secret: z.string().nullable().optional(),
        created: z.number(),
        description: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.string()).nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    cancellation_reason: z.string().optional(),
    client_secret: z.string().optional(),
    created: z.number(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Cancel a Stripe PaymentIntent.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.stripe.com/api/payment_intents/cancel
            endpoint: `/v1/payment_intents/${encodeURIComponent(input.id)}/cancel`,
            data: {
                ...(input.cancellation_reason !== undefined && { cancellation_reason: input.cancellation_reason })
            },
            retries: 3
        });

        const paymentIntent = ProviderPaymentIntentSchema.parse(response.data);

        return {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            ...(paymentIntent.cancellation_reason != null && { cancellation_reason: paymentIntent.cancellation_reason }),
            ...(paymentIntent.client_secret != null && { client_secret: paymentIntent.client_secret }),
            created: paymentIntent.created,
            ...(paymentIntent.description != null && { description: paymentIntent.description }),
            ...(paymentIntent.metadata != null && { metadata: paymentIntent.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
