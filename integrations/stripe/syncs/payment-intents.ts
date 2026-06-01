import { createSync } from 'nango';
import { z } from 'zod';

const PaymentIntentSchema = z.object({
    id: z.string(),
    amount: z.number().optional(),
    amount_capturable: z.number().optional(),
    amount_details: z.record(z.string(), z.unknown()).nullable().optional(),
    amount_received: z.number().optional(),
    application: z.string().nullable().optional(),
    application_fee_amount: z.number().nullable().optional(),
    automatic_payment_methods: z.record(z.string(), z.unknown()).nullable().optional(),
    canceled_at: z.number().nullable().optional(),
    cancellation_reason: z.string().nullable().optional(),
    capture_method: z.string().optional(),
    client_secret: z.string().optional(),
    confirmation_method: z.string().optional(),
    created: z.number(),
    currency: z.string().optional(),
    customer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    last_payment_error: z.record(z.string(), z.unknown()).nullable().optional(),
    latest_charge: z.string().nullable().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional(),
    next_action: z.record(z.string(), z.unknown()).nullable().optional(),
    on_behalf_of: z.string().nullable().optional(),
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
    status: z.string().optional(),
    transfer_data: z.record(z.string(), z.unknown()).nullable().optional(),
    transfer_group: z.string().nullable().optional()
});

const StripeListResponseSchema = z.object({
    object: z.string().optional(),
    url: z.string().optional(),
    has_more: z.boolean(),
    data: z.array(PaymentIntentSchema)
});

const PaymentIntentModelSchema = z.object({
    id: z.string(),
    amount: z.number().optional(),
    amount_capturable: z.number().optional(),
    amount_details: z.record(z.string(), z.unknown()).optional(),
    amount_received: z.number().optional(),
    application: z.string().optional(),
    application_fee_amount: z.number().optional(),
    automatic_payment_methods: z.record(z.string(), z.unknown()).optional(),
    canceled_at: z.number().optional(),
    cancellation_reason: z.string().optional(),
    capture_method: z.string().optional(),
    client_secret: z.string().optional(),
    confirmation_method: z.string().optional(),
    created: z.number(),
    currency: z.string().optional(),
    customer: z.string().optional(),
    description: z.string().optional(),
    last_payment_error: z.record(z.string(), z.unknown()).optional(),
    latest_charge: z.string().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    next_action: z.record(z.string(), z.unknown()).optional(),
    on_behalf_of: z.string().optional(),
    payment_method: z.string().optional(),
    payment_method_options: z.record(z.string(), z.unknown()).optional(),
    payment_method_types: z.array(z.string()).optional(),
    processing: z.record(z.string(), z.unknown()).optional(),
    receipt_email: z.string().optional(),
    review: z.string().optional(),
    setup_future_usage: z.string().optional(),
    shipping: z.record(z.string(), z.unknown()).optional(),
    source: z.string().optional(),
    statement_descriptor: z.string().optional(),
    statement_descriptor_suffix: z.string().optional(),
    status: z.string().optional(),
    transfer_data: z.record(z.string(), z.unknown()).optional(),
    transfer_group: z.string().optional()
});

const CheckpointSchema = z.object({
    created_after: z.number(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync payment intents from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/payment-intents'
        }
    ],
    models: {
        PaymentIntent: PaymentIntentModelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            created_after: typeof rawCheckpoint?.created_after === 'number' ? rawCheckpoint.created_after : 0,
            cursor: typeof rawCheckpoint?.cursor === 'string' ? rawCheckpoint.cursor : ''
        });

        const startTime = Math.floor(Date.now() / 1000);
        const createdAfter = checkpoint.created_after;
        let cursor = checkpoint.cursor;
        let hasMore = true;

        while (hasMore) {
            const params = {
                limit: 100,
                ...(createdAfter > 0 && { 'created[gte]': createdAfter }),
                ...(cursor !== '' && { starting_after: cursor })
            };

            // https://docs.stripe.com/api/payment_intents/list
            const response = await nango.get({
                endpoint: '/v1/payment_intents',
                params,
                retries: 3
            });

            const parsed = StripeListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse payment intents response: ${parsed.error.message}`);
            }

            const { data, has_more } = parsed.data;

            if (data.length === 0) {
                break;
            }

            const paymentIntents = data.map((pi) => ({
                id: pi.id,
                amount: pi.amount,
                amount_capturable: pi.amount_capturable,
                amount_details: pi.amount_details ?? undefined,
                amount_received: pi.amount_received,
                application: pi.application ?? undefined,
                application_fee_amount: pi.application_fee_amount ?? undefined,
                automatic_payment_methods: pi.automatic_payment_methods ?? undefined,
                canceled_at: pi.canceled_at ?? undefined,
                cancellation_reason: pi.cancellation_reason ?? undefined,
                capture_method: pi.capture_method,
                client_secret: pi.client_secret,
                confirmation_method: pi.confirmation_method,
                created: pi.created,
                currency: pi.currency,
                customer: pi.customer ?? undefined,
                description: pi.description ?? undefined,
                last_payment_error: pi.last_payment_error ?? undefined,
                latest_charge: pi.latest_charge ?? undefined,
                livemode: pi.livemode,
                metadata: pi.metadata ?? undefined,
                next_action: pi.next_action ?? undefined,
                on_behalf_of: pi.on_behalf_of ?? undefined,
                payment_method: pi.payment_method ?? undefined,
                payment_method_options: pi.payment_method_options ?? undefined,
                payment_method_types: pi.payment_method_types ?? undefined,
                processing: pi.processing ?? undefined,
                receipt_email: pi.receipt_email ?? undefined,
                review: pi.review ?? undefined,
                setup_future_usage: pi.setup_future_usage ?? undefined,
                shipping: pi.shipping ?? undefined,
                source: pi.source ?? undefined,
                statement_descriptor: pi.statement_descriptor ?? undefined,
                statement_descriptor_suffix: pi.statement_descriptor_suffix ?? undefined,
                status: pi.status,
                transfer_data: pi.transfer_data ?? undefined,
                transfer_group: pi.transfer_group ?? undefined
            }));

            await nango.batchSave(paymentIntents, 'PaymentIntent');

            const lastElement = data[data.length - 1];
            if (has_more && lastElement) {
                cursor = lastElement.id;
                await nango.saveCheckpoint({
                    created_after: createdAfter,
                    cursor
                });
            }

            hasMore = has_more;
        }

        await nango.saveCheckpoint({ created_after: startTime, cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
