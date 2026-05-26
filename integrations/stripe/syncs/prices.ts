import { createSync } from 'nango';
import { z } from 'zod';

const PriceSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    active: z.boolean().optional(),
    billing_scheme: z.string().optional(),
    created: z.number().optional(),
    currency: z.string().optional(),
    custom_unit_amount: z
        .object({
            maximum: z.number().optional(),
            minimum: z.number().optional(),
            preset: z.number().optional()
        })
        .nullable()
        .optional(),
    livemode: z.boolean().optional(),
    lookup_key: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    nickname: z.string().nullable().optional(),
    product: z.string().optional(),
    recurring: z
        .object({
            interval: z.string().optional(),
            interval_count: z.number().optional(),
            trial_period_days: z.number().nullable().optional(),
            usage_type: z.string().optional()
        })
        .nullable()
        .optional(),
    tax_behavior: z.string().nullable().optional(),
    tiers_mode: z.string().nullable().optional(),
    transform_quantity: z
        .object({
            divide_by: z.number().optional(),
            round: z.string().optional()
        })
        .nullable()
        .optional(),
    type: z.string().optional(),
    unit_amount: z.number().nullable().optional(),
    unit_amount_decimal: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const ListResponseSchema = z.object({
    object: z.string(),
    data: z.array(z.unknown()),
    has_more: z.boolean()
});

const sync = createSync({
    description: 'Sync prices from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Price: PriceSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/prices'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        let startingAfter = checkpoint?.data.starting_after ?? '';
        let hasMore = true;

        while (hasMore) {
            // https://docs.stripe.com/api/prices/list
            const response = await nango.get({
                endpoint: '/v1/prices',
                params: {
                    limit: '100',
                    ...(startingAfter ? { starting_after: startingAfter } : {})
                },
                retries: 3
            });

            const parsedResponse = ListResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid Stripe prices list response: ${parsedResponse.error.message}`);
            }

            const prices = parsedResponse.data.data.map((item) => {
                const parsed = PriceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse price: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (prices.length > 0) {
                await nango.batchSave(prices, 'Price');
            }

            hasMore = parsedResponse.data.has_more;
            if (!hasMore) {
                break;
            }

            const lastPrice = prices.at(-1);
            if (!lastPrice) {
                break;
            }

            startingAfter = lastPrice.id;
            await nango.saveCheckpoint({ starting_after: lastPrice.id });
        }

        await nango.saveCheckpoint({ starting_after: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
