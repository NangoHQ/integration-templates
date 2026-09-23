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

const ProviderCouponListSchema = z.object({
    data: z.array(ProviderCouponSchema),
    links: z.object({
        next: z.string().nullable().optional()
    })
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync coupons.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Coupon: CouponSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/coupons has no changed-since filter, deleted-record endpoint,
        // or resumable incremental cursor. Full refresh is required.
        const checkpoint = await nango.getCheckpoint();

        let cursor: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            cursor = parsedCheckpoint.data.cursor;
        }

        await nango.trackDeletesStart('Coupon');

        let hasNext = true;
        while (hasNext) {
            const params: Record<string, string | number> = {
                'page[size]': 100
            };

            if (cursor) {
                params['page[cursor]'] = cursor;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.klaviyo.com/en/reference/get_coupons
                endpoint: '/api/coupons',
                headers: {
                    revision: '2026-04-15'
                },
                params,
                retries: 3
            };

            const response = await nango.get(proxyConfig);

            const parsedList = ProviderCouponListSchema.safeParse(response.data);
            if (!parsedList.success) {
                throw new Error(`Failed to parse coupon list: ${parsedList.error.message}`);
            }

            const coupons = parsedList.data.data.map((record) => ({
                id: record.id,
                external_id: record.attributes.external_id,
                ...(record.attributes.description != null && { description: record.attributes.description }),
                ...(record.attributes.monitor_configuration != null && { monitor_configuration: record.attributes.monitor_configuration })
            }));

            if (coupons.length > 0) {
                await nango.batchSave(coupons, 'Coupon');
            }

            const nextLink = parsedList.data.links.next;
            if (!nextLink) {
                hasNext = false;
                break;
            }

            const nextUrl = new URL(nextLink);
            const nextCursor = nextUrl.searchParams.get('page[cursor]');
            if (!nextCursor) {
                throw new Error(`Missing page[cursor] in next link: ${nextLink}`);
            }

            cursor = nextCursor;
            await nango.saveCheckpoint({ cursor });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Coupon');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
