import { createSync } from 'nango';
import { z } from 'zod';

const SubscriptionItemSchema = z.object({
    id: z.string(),
    price_id: z.string().optional(),
    product_id: z.string().optional(),
    quantity: z.number().optional()
});

const SubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer: z.string(),
    created: z.number(),
    current_period_start: z.number().optional(),
    current_period_end: z.number().optional(),
    cancel_at_period_end: z.boolean().optional(),
    canceled_at: z.number().nullable().optional(),
    ended_at: z.number().nullable().optional(),
    collection_method: z.string().optional(),
    currency: z.string().optional(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    items: z.array(SubscriptionItemSchema).optional()
});

const CheckpointSchema = z.object({
    created_after: z.number(),
    starting_after: z.string()
});

const StripePriceSchema = z.object({
    id: z.string().optional(),
    product: z.string().optional()
});

const StripeSubscriptionItemSchema = z.object({
    id: z.string(),
    price: StripePriceSchema.optional(),
    quantity: z.number().optional()
});

const StripeSubscriptionSchema = z.object({
    id: z.string(),
    object: z.string(),
    status: z.string(),
    customer: z.string(),
    created: z.number(),
    current_period_start: z.number().optional(),
    current_period_end: z.number().optional(),
    cancel_at_period_end: z.boolean().optional(),
    canceled_at: z.number().nullable().optional(),
    ended_at: z.number().nullable().optional(),
    collection_method: z.string().optional(),
    currency: z.string().optional(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    items: z
        .object({
            object: z.string().optional(),
            data: z.array(StripeSubscriptionItemSchema).optional(),
            has_more: z.boolean().optional()
        })
        .optional()
});

const StripeListResponseSchema = z.object({
    object: z.string(),
    data: z.array(z.unknown()),
    has_more: z.boolean()
});

const sync = createSync({
    description: 'Sync subscriptions from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/subscriptions'
        }
    ],
    models: {
        Subscription: SubscriptionSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const createdAfterRaw = checkpoint?.['created_after'];
        const createdAfter = typeof createdAfterRaw === 'number' && createdAfterRaw > 0 ? createdAfterRaw : undefined;
        const startingAfterRaw = checkpoint?.['starting_after'];
        let startingAfter = typeof startingAfterRaw === 'string' && startingAfterRaw !== '' ? startingAfterRaw : undefined;

        let hasMore = true;
        let maxCreated: number | undefined;

        while (hasMore) {
            // https://docs.stripe.com/api/subscriptions/list
            const response = await nango.get({
                endpoint: '/v1/subscriptions',
                params: {
                    status: 'all',
                    ...(createdAfter !== undefined && { 'created[gte]': createdAfter }),
                    ...(startingAfter !== undefined && { starting_after: startingAfter }),
                    limit: 100
                },
                retries: 3
            });

            const parsedResponse = StripeListResponseSchema.parse(response.data);
            const rawData = parsedResponse.data;
            hasMore = parsedResponse.has_more;

            if (!rawData || rawData.length === 0) {
                break;
            }

            const subscriptions: Array<z.infer<typeof SubscriptionSchema>> = [];
            for (const raw of rawData) {
                const parseResult = StripeSubscriptionSchema.safeParse(raw);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse subscription: ${parseResult.error.message}`);
                }

                const sub = parseResult.data;
                const items: Array<z.infer<typeof SubscriptionItemSchema>> = [];
                if (sub.items && sub.items.data && sub.items.data.length > 0) {
                    for (const item of sub.items.data) {
                        items.push({
                            id: item.id,
                            ...(item.price?.id !== undefined && { price_id: item.price.id }),
                            ...(item.price?.product !== undefined && { product_id: item.price.product }),
                            ...(item.quantity !== undefined && { quantity: item.quantity })
                        });
                    }
                }

                subscriptions.push({
                    id: sub.id,
                    status: sub.status,
                    customer: sub.customer,
                    created: sub.created,
                    ...(sub.current_period_start !== undefined && { current_period_start: sub.current_period_start }),
                    ...(sub.current_period_end !== undefined && { current_period_end: sub.current_period_end }),
                    ...(sub.cancel_at_period_end !== undefined && { cancel_at_period_end: sub.cancel_at_period_end }),
                    ...(sub.canceled_at !== null && { canceled_at: sub.canceled_at }),
                    ...(sub.ended_at !== null && { ended_at: sub.ended_at }),
                    ...(sub.collection_method !== undefined && { collection_method: sub.collection_method }),
                    ...(sub.currency !== undefined && { currency: sub.currency }),
                    ...(sub.description !== null && { description: sub.description }),
                    ...(sub.metadata !== undefined && { metadata: sub.metadata }),
                    ...(items.length > 0 && { items })
                });

                if (maxCreated === undefined || sub.created > maxCreated) {
                    maxCreated = sub.created;
                }
            }

            if (subscriptions.length > 0) {
                await nango.batchSave(subscriptions, 'Subscription');
            }

            const lastSub = rawData[rawData.length - 1];
            const lastParse = typeof lastSub === 'object' && lastSub !== null ? StripeSubscriptionSchema.safeParse(lastSub) : null;
            if (hasMore && lastParse && lastParse.success) {
                startingAfter = lastParse.data.id;
                await nango.saveCheckpoint({
                    created_after: createdAfter ?? 0,
                    starting_after: startingAfter
                });
            }
        }

        if (maxCreated !== undefined) {
            await nango.saveCheckpoint({ created_after: maxCreated, starting_after: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
