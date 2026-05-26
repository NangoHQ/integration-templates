import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAdGroupSchema = z.object({
    adgroup_id: z.union([z.string(), z.number()]),
    advertiser_id: z.union([z.string(), z.number()]).optional(),
    campaign_id: z.union([z.string(), z.number()]).optional(),
    adgroup_name: z.string().optional(),
    placement_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    status: z.string().optional(),
    secondary_status: z.string().optional(),
    optimization_goal: z.string().optional(),
    bid_type: z.string().optional(),
    bid_price: z.number().optional(),
    promotion_type: z.string().optional(),
    schedule_start_time: z.string().optional(),
    schedule_end_time: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const AdGroupSchema = z.object({
    id: z.string(),
    advertiser_id: z.string().optional(),
    campaign_id: z.string().optional(),
    adgroup_name: z.string().optional(),
    placement_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    status: z.string().optional(),
    secondary_status: z.string().optional(),
    optimization_goal: z.string().optional(),
    bid_type: z.string().optional(),
    bid_price: z.number().optional(),
    promotion_type: z.string().optional(),
    schedule_start_time: z.string().optional(),
    schedule_end_time: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync ad groups from TikTok Ads.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/ad-groups' }],
    frequency: 'every hour',
    models: {
        AdGroup: AdGroupSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const parsedConnection = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).optional()
            })
            .parse(connection);
        const advertiserId = z.string().parse(parsedConnection.connection_config?.['advertiser_id'] ?? '7644143197428744199');

        await nango.trackDeletesStart('AdGroup');

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739314558673922
            endpoint: 'adgroup/get/',
            params: {
                advertiser_id: advertiserId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const items: unknown[] = batch;

            const adGroups = items.map((item) => {
                const parsed = ProviderAdGroupSchema.parse(item);

                return {
                    id: String(parsed.adgroup_id),
                    ...(parsed.advertiser_id !== undefined && { advertiser_id: String(parsed.advertiser_id) }),
                    ...(parsed.campaign_id !== undefined && { campaign_id: String(parsed.campaign_id) }),
                    ...(parsed.adgroup_name !== undefined && { adgroup_name: parsed.adgroup_name }),
                    ...(parsed.placement_type !== undefined && { placement_type: parsed.placement_type }),
                    ...(parsed.budget !== undefined && { budget: parsed.budget }),
                    ...(parsed.budget_mode !== undefined && { budget_mode: parsed.budget_mode }),
                    ...(parsed.status !== undefined && { status: parsed.status }),
                    ...(parsed.secondary_status !== undefined && { secondary_status: parsed.secondary_status }),
                    ...(parsed.optimization_goal !== undefined && { optimization_goal: parsed.optimization_goal }),
                    ...(parsed.bid_type !== undefined && { bid_type: parsed.bid_type }),
                    ...(parsed.bid_price !== undefined && { bid_price: parsed.bid_price }),
                    ...(parsed.promotion_type !== undefined && { promotion_type: parsed.promotion_type }),
                    ...(parsed.schedule_start_time !== undefined && { schedule_start_time: parsed.schedule_start_time }),
                    ...(parsed.schedule_end_time !== undefined && { schedule_end_time: parsed.schedule_end_time }),
                    ...(parsed.create_time !== undefined && { create_time: parsed.create_time }),
                    ...(parsed.modify_time !== undefined && { modify_time: parsed.modify_time })
                };
            });

            if (adGroups.length > 0) {
                await nango.batchSave(adGroups, 'AdGroup');
            }
        }

        await nango.trackDeletesEnd('AdGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
