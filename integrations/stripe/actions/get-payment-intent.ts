import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    intent_id: z.string().describe('Stripe PaymentIntent ID. Example: pi_3TbSonEZpD6kXrae0do5CLRX')
});

const PaymentIntentSchema = z
    .object({
        id: z.string(),
        object: z.literal('payment_intent'),
        amount: z.number(),
        amount_capturable: z.number().nullable().optional(),
        amount_received: z.number().nullable().optional(),
        application: z.string().nullable().optional(),
        application_fee_amount: z.number().nullable().optional(),
        automatic_payment_methods: z.record(z.string(), z.unknown()).nullable().optional(),
        canceled_at: z.number().nullable().optional(),
        cancellation_reason: z.string().nullable().optional(),
        capture_method: z.string(),
        charges: z.record(z.string(), z.unknown()).nullable().optional(),
        client_secret: z.string().nullable().optional(),
        confirmation_method: z.string(),
        created: z.number(),
        currency: z.string(),
        customer: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        invoice: z.string().nullable().optional(),
        last_payment_error: z.record(z.string(), z.unknown()).nullable().optional(),
        latest_charge: z.string().nullable().optional(),
        livemode: z.boolean(),
        metadata: z.record(z.string(), z.string()).nullable().optional(),
        next_action: z.record(z.string(), z.unknown()).nullable().optional(),
        payment_method: z.string().nullable().optional(),
        payment_method_options: z.record(z.string(), z.unknown()).nullable().optional(),
        payment_method_types: z.array(z.string()).nullable().optional(),
        processing: z.record(z.string(), z.unknown()).nullable().optional(),
        receipt_email: z.string().nullable().optional(),
        review: z.string().nullable().optional(),
        setup_future_usage: z.string().nullable().optional(),
        shipping: z.record(z.string(), z.unknown()).nullable().optional(),
        source: z.string().nullable().optional(),
        statement_descriptor: z.string().nullable().optional(),
        statement_descriptor_suffix: z.string().nullable().optional(),
        status: z.string(),
        transfer_data: z.record(z.string(), z.unknown()).nullable().optional(),
        transfer_group: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single payment intent from Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: PaymentIntentSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof PaymentIntentSchema>> => {
        const response = await nango.get({
            // https://docs.stripe.com/api/payment_intents/retrieve
            endpoint: `/v1/payment_intents/${encodeURIComponent(input.intent_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Payment intent not found',
                intent_id: input.intent_id
            });
        }

        const paymentIntent = PaymentIntentSchema.parse(response.data);
        return paymentIntent;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
