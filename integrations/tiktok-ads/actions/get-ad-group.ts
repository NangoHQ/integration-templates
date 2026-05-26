import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    adgroup_id: z.string().describe('Ad group ID. Example: "1866248998099217"')
});

const ProviderAdGroupSchema = z.object({
    adgroup_id: z.string(),
    campaign_id: z.string(),
    advertiser_id: z.string(),
    adgroup_name: z.string().optional().nullable(),
    placement_type: z.string().optional().nullable(),
    placements: z.array(z.string()).optional().nullable(),
    budget: z.number().optional().nullable(),
    budget_mode: z.string().optional().nullable(),
    secondary_status: z.string().optional().nullable(),
    operation_status: z.string().optional().nullable(),
    optimization_goal: z.string().optional().nullable(),
    bid_type: z.string().optional().nullable(),
    bid_price: z.number().optional().nullable(),
    promotion_type: z.string().optional().nullable(),
    schedule_type: z.string().optional().nullable(),
    schedule_start_time: z.string().optional().nullable(),
    schedule_end_time: z.string().optional().nullable(),
    create_time: z.string().optional().nullable(),
    modify_time: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    age_groups: z.array(z.string()).optional().nullable(),
    audience_ids: z.array(z.string()).optional().nullable(),
    audience_type: z.string().optional().nullable(),
    pixel_id: z.string().optional().nullable(),
    app_id: z.string().optional().nullable(),
    app_download_url: z.string().optional().nullable(),
    identity_id: z.string().optional().nullable(),
    identity_type: z.string().optional().nullable(),
    comment_disabled: z.boolean().optional().nullable(),
    share_disabled: z.boolean().optional().nullable(),
    creative_material_mode: z.string().optional().nullable(),
    conversion_bid_price: z.number().optional().nullable(),
    deep_bid_type: z.string().optional().nullable(),
    auto_targeting_enabled: z.boolean().optional().nullable(),
    targeting_expansion: z
        .object({
            expansion_enabled: z.boolean().optional(),
            expansion_type: z.string().optional()
        })
        .optional()
        .nullable(),
    dayparting: z.string().optional().nullable(),
    pacing: z.string().optional().nullable(),
    roas_bid: z.number().optional().nullable()
});

const OutputSchema = z.object({
    adgroup_id: z.string(),
    campaign_id: z.string(),
    advertiser_id: z.string(),
    adgroup_name: z.string().optional(),
    placement_type: z.string().optional(),
    placements: z.array(z.string()).optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    secondary_status: z.string().optional(),
    operation_status: z.string().optional(),
    optimization_goal: z.string().optional(),
    bid_type: z.string().optional(),
    bid_price: z.number().optional(),
    promotion_type: z.string().optional(),
    schedule_type: z.string().optional(),
    schedule_start_time: z.string().optional(),
    schedule_end_time: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    gender: z.string().optional(),
    age_groups: z.array(z.string()).optional(),
    audience_ids: z.array(z.string()).optional(),
    audience_type: z.string().optional(),
    pixel_id: z.string().optional(),
    app_id: z.string().optional(),
    app_download_url: z.string().optional(),
    identity_id: z.string().optional(),
    identity_type: z.string().optional(),
    comment_disabled: z.boolean().optional(),
    share_disabled: z.boolean().optional(),
    creative_material_mode: z.string().optional(),
    conversion_bid_price: z.number().optional(),
    deep_bid_type: z.string().optional(),
    auto_targeting_enabled: z.boolean().optional(),
    targeting_expansion: z
        .object({
            expansion_enabled: z.boolean().optional(),
            expansion_type: z.string().optional()
        })
        .optional(),
    dayparting: z.string().optional(),
    pacing: z.string().optional(),
    roas_bid: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single ad group from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-ad-group',
        group: 'Ad Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739314558673922
        const response = await nango.get({
            endpoint: '/adgroup/get/',
            params: {
                advertiser_id: input.advertiser_id,
                filtering: JSON.stringify({ adgroup_ids: [input.adgroup_id] })
            },
            retries: 3
        });

        const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        const responseData = z
            .object({
                code: z.number(),
                message: z.string(),
                data: z
                    .object({
                        list: z.array(z.unknown())
                    })
                    .optional()
                    .nullable()
            })
            .parse(rawData);

        if (responseData.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: responseData.message
            });
        }

        if (!responseData.data || !responseData.data.list || responseData.data.list.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ad group not found',
                adgroup_id: input.adgroup_id
            });
        }

        const providerAdGroup = ProviderAdGroupSchema.parse(responseData.data.list[0]);

        return {
            adgroup_id: providerAdGroup.adgroup_id,
            campaign_id: providerAdGroup.campaign_id,
            advertiser_id: providerAdGroup.advertiser_id,
            ...(providerAdGroup.adgroup_name != null && { adgroup_name: providerAdGroup.adgroup_name }),
            ...(providerAdGroup.placement_type != null && { placement_type: providerAdGroup.placement_type }),
            ...(providerAdGroup.placements != null && { placements: providerAdGroup.placements }),
            ...(providerAdGroup.budget != null && { budget: providerAdGroup.budget }),
            ...(providerAdGroup.budget_mode != null && { budget_mode: providerAdGroup.budget_mode }),
            ...(providerAdGroup.secondary_status != null && { secondary_status: providerAdGroup.secondary_status }),
            ...(providerAdGroup.operation_status != null && { operation_status: providerAdGroup.operation_status }),
            ...(providerAdGroup.optimization_goal != null && { optimization_goal: providerAdGroup.optimization_goal }),
            ...(providerAdGroup.bid_type != null && { bid_type: providerAdGroup.bid_type }),
            ...(providerAdGroup.bid_price != null && { bid_price: providerAdGroup.bid_price }),
            ...(providerAdGroup.promotion_type != null && { promotion_type: providerAdGroup.promotion_type }),
            ...(providerAdGroup.schedule_type != null && { schedule_type: providerAdGroup.schedule_type }),
            ...(providerAdGroup.schedule_start_time != null && { schedule_start_time: providerAdGroup.schedule_start_time }),
            ...(providerAdGroup.schedule_end_time != null && { schedule_end_time: providerAdGroup.schedule_end_time }),
            ...(providerAdGroup.create_time != null && { create_time: providerAdGroup.create_time }),
            ...(providerAdGroup.modify_time != null && { modify_time: providerAdGroup.modify_time }),
            ...(providerAdGroup.gender != null && { gender: providerAdGroup.gender }),
            ...(providerAdGroup.age_groups != null && { age_groups: providerAdGroup.age_groups }),
            ...(providerAdGroup.audience_ids != null && { audience_ids: providerAdGroup.audience_ids }),
            ...(providerAdGroup.audience_type != null && { audience_type: providerAdGroup.audience_type }),
            ...(providerAdGroup.pixel_id != null && { pixel_id: providerAdGroup.pixel_id }),
            ...(providerAdGroup.app_id != null && { app_id: providerAdGroup.app_id }),
            ...(providerAdGroup.app_download_url != null && { app_download_url: providerAdGroup.app_download_url }),
            ...(providerAdGroup.identity_id != null && { identity_id: providerAdGroup.identity_id }),
            ...(providerAdGroup.identity_type != null && { identity_type: providerAdGroup.identity_type }),
            ...(providerAdGroup.comment_disabled != null && { comment_disabled: providerAdGroup.comment_disabled }),
            ...(providerAdGroup.share_disabled != null && { share_disabled: providerAdGroup.share_disabled }),
            ...(providerAdGroup.creative_material_mode != null && { creative_material_mode: providerAdGroup.creative_material_mode }),
            ...(providerAdGroup.conversion_bid_price != null && { conversion_bid_price: providerAdGroup.conversion_bid_price }),
            ...(providerAdGroup.deep_bid_type != null && { deep_bid_type: providerAdGroup.deep_bid_type }),
            ...(providerAdGroup.auto_targeting_enabled != null && { auto_targeting_enabled: providerAdGroup.auto_targeting_enabled }),
            ...(providerAdGroup.targeting_expansion != null && { targeting_expansion: providerAdGroup.targeting_expansion }),
            ...(providerAdGroup.dayparting != null && { dayparting: providerAdGroup.dayparting }),
            ...(providerAdGroup.pacing != null && { pacing: providerAdGroup.pacing }),
            ...(providerAdGroup.roas_bid != null && { roas_bid: providerAdGroup.roas_bid })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
