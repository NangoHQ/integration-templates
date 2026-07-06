import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CouponSchema = z.object({
    id: z.string(),
    external_id: z.string(),
    description: z.string().optional(),
    monitor_configuration: z.record(z.string(), z.unknown()).optional()
});

const ProviderCouponSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
        external_id: z.string(),
        description: z.string().nullable().optional(),
        monitor_configuration: z.record(z.string(), z.unknown()).nullable().optional()
    })
});

const sync = createSync({
    description: 'Sync coupons.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Coupon: CouponSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/coupons has no changed-since filter, deleted-record endpoint,
        // or resumable incremental cursor. Full refresh is required.
        await nango.trackDeletesStart('Coupon');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_coupons
            endpoint: '/api/coupons',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                'page[size]': 100
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderCouponSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse coupon page: ${parsed.error.message}`);
            }

            const coupons = parsed.data.map((record) => ({
                id: record.id,
                external_id: record.attributes.external_id,
                ...(record.attributes.description != null && { description: record.attributes.description }),
                ...(record.attributes.monitor_configuration != null && { monitor_configuration: record.attributes.monitor_configuration })
            }));

            if (coupons.length > 0) {
                await nango.batchSave(coupons, 'Coupon');
            }
        }

        await nango.trackDeletesEnd('Coupon');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
