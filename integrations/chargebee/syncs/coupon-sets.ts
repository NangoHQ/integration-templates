import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CouponSetSchema = z.object({
    id: z.string(),
    coupon_id: z.string(),
    name: z.string(),
    total_count: z.number().optional(),
    redeemed_count: z.number().optional(),
    archived_count: z.number().optional(),
    meta_data: z.record(z.string(), z.unknown()).optional()
});

const ListItemSchema = z.object({
    coupon_set: z.object({
        id: z.string(),
        coupon_id: z.string(),
        name: z.string(),
        total_count: z.number().optional(),
        redeemed_count: z.number().optional(),
        archived_count: z.number().optional(),
        meta_data: z.record(z.string(), z.unknown()).optional()
    })
});

const sync = createSync({
    description: 'Sync coupon sets as a full refresh (Product Catalog 2.0). PC2 replacement for legacy /coupons.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://apidocs.chargebee.com/docs/api/coupon_sets
    models: {
        CouponSet: CouponSetSchema
    },

    exec: async (nango) => {
        // https://apidocs.chargebee.com/docs/api/coupon_sets
        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/coupon_sets
            endpoint: '/api/v2/coupon_sets',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('CouponSet');

        for await (const page of nango.paginate(proxyConfig)) {
            const items = ListItemSchema.array().parse(page);
            const couponSets = items.map((item) => {
                const couponSet = item.coupon_set;
                return {
                    id: couponSet.id,
                    coupon_id: couponSet.coupon_id,
                    name: couponSet.name,
                    ...(couponSet.total_count !== undefined && { total_count: couponSet.total_count }),
                    ...(couponSet.redeemed_count !== undefined && { redeemed_count: couponSet.redeemed_count }),
                    ...(couponSet.archived_count !== undefined && { archived_count: couponSet.archived_count }),
                    ...(couponSet.meta_data !== undefined && { meta_data: couponSet.meta_data })
                };
            });

            if (couponSets.length > 0) {
                await nango.batchSave(couponSets, 'CouponSet');
            }
        }

        await nango.trackDeletesEnd('CouponSet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
