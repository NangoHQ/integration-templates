import { createSync } from 'nango';
import { z } from 'zod';

const RawCheckoutSessionSchema = z.object({
    id: z.string(),
    amount_subtotal: z.number().nullish(),
    amount_total: z.number().nullish(),
    created: z.number(),
    currency: z.string().nullish(),
    customer: z.string().nullish(),
    customer_email: z.string().nullish(),
    expires_at: z.number().nullish(),
    livemode: z.boolean().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    mode: z.string().nullish(),
    payment_intent: z.string().nullish(),
    payment_status: z.string().nullish(),
    status: z.string().nullish(),
    subscription: z.string().nullish(),
    success_url: z.string().nullish(),
    url: z.string().nullish()
});

type RawCheckoutSession = z.infer<typeof RawCheckoutSessionSchema>;

const CheckoutSessionSchema = z.object({
    id: z.string(),
    amount_subtotal: z.number().optional(),
    amount_total: z.number().optional(),
    created: z.number(),
    currency: z.string().optional(),
    customer: z.string().optional(),
    customer_email: z.string().optional(),
    expires_at: z.number().optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    mode: z.string().optional(),
    payment_intent: z.string().optional(),
    payment_status: z.string().optional(),
    status: z.string().optional(),
    subscription: z.string().optional(),
    success_url: z.string().optional(),
    url: z.string().optional()
});

type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

const StripeListResponseSchema = z.object({
    object: z.literal('list'),
    data: z.array(z.unknown()),
    has_more: z.boolean(),
    url: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

function mapCheckoutSession(raw: RawCheckoutSession): CheckoutSession {
    return {
        id: raw.id,
        created: raw.created,
        ...(raw.amount_subtotal != null && { amount_subtotal: raw.amount_subtotal }),
        ...(raw.amount_total != null && { amount_total: raw.amount_total }),
        ...(raw.currency != null && { currency: raw.currency }),
        ...(raw.customer != null && { customer: raw.customer }),
        ...(raw.customer_email != null && { customer_email: raw.customer_email }),
        ...(raw.expires_at != null && { expires_at: raw.expires_at }),
        ...(raw.livemode != null && { livemode: raw.livemode }),
        ...(raw.metadata != null && { metadata: raw.metadata }),
        ...(raw.mode != null && { mode: raw.mode }),
        ...(raw.payment_intent != null && { payment_intent: raw.payment_intent }),
        ...(raw.payment_status != null && { payment_status: raw.payment_status }),
        ...(raw.status != null && { status: raw.status }),
        ...(raw.subscription != null && { subscription: raw.subscription }),
        ...(raw.success_url != null && { success_url: raw.success_url }),
        ...(raw.url != null && { url: raw.url })
    };
}

const sync = createSync({
    description: 'Sync checkout sessions from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CheckoutSession: CheckoutSessionSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/checkout-sessions'
        }
    ],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = checkpointResult ? CheckpointSchema.safeParse(checkpointResult) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error('Invalid checkpoint: ' + checkpoint.error.message);
        }

        let cursor = checkpoint?.data.cursor ?? '';

        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = {
                limit: 100,
                ...(cursor.length > 0 && { starting_after: cursor })
            };

            // https://docs.stripe.com/api/checkout/sessions/list
            const response = await nango.get({
                endpoint: '/v1/checkout/sessions',
                params,
                retries: 3
            });

            const parsedList = StripeListResponseSchema.safeParse(response.data);
            if (!parsedList.success) {
                throw new Error('Invalid list response: ' + parsedList.error.message);
            }

            const page = parsedList.data.data;

            if (page.length === 0) {
                hasMore = false;
                continue;
            }

            const sessions: CheckoutSession[] = [];
            for (const item of page) {
                const parsedItem = RawCheckoutSessionSchema.safeParse(item);
                if (!parsedItem.success) {
                    throw new Error('Invalid checkout session: ' + parsedItem.error.message);
                }
                sessions.push(mapCheckoutSession(parsedItem.data));
            }

            await nango.batchSave(sessions, 'CheckoutSession');

            hasMore = parsedList.data.has_more;

            if (!hasMore) {
                break;
            }

            const lastItem = page[page.length - 1];
            const parsedLast = RawCheckoutSessionSchema.safeParse(lastItem);
            if (!parsedLast.success) {
                throw new Error('Invalid checkout session: ' + parsedLast.error.message);
            }

            cursor = parsedLast.data.id;
            await nango.saveCheckpoint({ cursor });
        }

        await nango.saveCheckpoint({ cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
