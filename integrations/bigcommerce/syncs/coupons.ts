import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCouponSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        amount: z.string().nullable().optional(),
        min_purchase: z.string().nullable().optional(),
        expires: z.string().nullable().optional(),
        enabled: z.boolean().nullable().optional(),
        code: z.string().nullable().optional(),
        applies_to: z
            .object({
                entity: z.string(),
                ids: z.array(z.number())
            })
            .nullable()
            .optional(),
        num_uses: z.number().nullable().optional(),
        max_uses: z.number().nullable().optional(),
        max_uses_per_customer: z.number().nullable().optional(),
        restricted_to: z.array(z.string()).nullable().optional(),
        shipping_methods: z.array(z.string()).nullable().optional()
    })
    .passthrough();

const CouponSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    amount: z.string().optional(),
    min_purchase: z.string().optional(),
    expires: z.string().optional(),
    enabled: z.boolean().optional(),
    code: z.string().optional(),
    applies_to: z
        .object({
            entity: z.string(),
            ids: z.array(z.number())
        })
        .optional(),
    num_uses: z.number().optional(),
    max_uses: z.number().optional(),
    max_uses_per_customer: z.number().optional(),
    restricted_to: z.array(z.string()).optional(),
    shipping_methods: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync coupons.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Coupon: CouponSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/coupons'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { page: 1 });

        // Blocker: the v2 coupons endpoint does not expose a modified-date filter,
        // so we perform a full snapshot with delete tracking.
        await nango.trackDeletesStart('Coupon');

        const limit = 50;
        let page = checkpoint.page;

        while (true) {
            // https://developer.bigcommerce.com/docs/rest-management/marketing/coupons
            const response = await nango.get({
                endpoint: '/v2/coupons',
                params: {
                    page: String(page),
                    limit: String(limit)
                },
                retries: 3
            });

            if (response.status === 204) {
                break;
            }

            const parsed = z.array(ProviderCouponSchema).safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse coupons page ${page}: ${parsed.error.message}`);
            }

            const coupons = parsed.data.map((coupon) => ({
                id: String(coupon.id),
                ...(coupon.name != null && { name: coupon.name }),
                ...(coupon.type != null && { type: coupon.type }),
                ...(coupon.amount != null && { amount: coupon.amount }),
                ...(coupon.min_purchase != null && { min_purchase: coupon.min_purchase }),
                ...(coupon.expires != null && { expires: coupon.expires }),
                ...(coupon.enabled != null && { enabled: coupon.enabled }),
                ...(coupon.code != null && { code: coupon.code }),
                ...(coupon.applies_to != null && { applies_to: coupon.applies_to }),
                ...(coupon.num_uses != null && { num_uses: coupon.num_uses }),
                ...(coupon.max_uses != null && { max_uses: coupon.max_uses }),
                ...(coupon.max_uses_per_customer != null && { max_uses_per_customer: coupon.max_uses_per_customer }),
                ...(coupon.restricted_to != null && { restricted_to: coupon.restricted_to }),
                ...(coupon.shipping_methods != null && { shipping_methods: coupon.shipping_methods })
            }));

            if (coupons.length === 0) {
                break;
            }

            await nango.batchSave(coupons, 'Coupon');

            if (parsed.data.length < limit) {
                break;
            }

            page += 1;
            await nango.saveCheckpoint({ page });
        }

        await nango.trackDeletesEnd('Coupon');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
