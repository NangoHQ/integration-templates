import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const IdentityInfoSchema = z.object({
    identity_authorized_bc_id: z.string().optional(),
    identity_authorized_shop_id: z.string().optional(),
    identity_id: z.string(),
    identity_type: z.string(),
    store_id: z.string().optional()
});

const CustomAnchorVideoSchema = z.object({
    identity_info: IdentityInfoSchema.optional(),
    item_id: z.string().optional(),
    spu_id_list: z.array(z.string()).optional()
});

const IdentityListSchema = z.object({
    identity_authorized_bc_id: z.string().optional(),
    identity_authorized_shop_id: z.string().optional(),
    identity_id: z.string(),
    identity_type: z.string(),
    store_id: z.string().optional()
});

const VideoInfoSchema = z.object({
    video_id: z.string()
});

const ItemListSchema = z.object({
    identity_info: IdentityInfoSchema.optional(),
    item_id: z.string().optional(),
    spu_id_list: z.array(z.string()).optional(),
    video_info: VideoInfoSchema.optional()
});

const CustomScheduleSchema = z.object({
    end_date: z.string(),
    schedule_type: z.string().optional(),
    start_date: z.string()
});

const PromotionDaysSchema = z.object({
    auto_schedule_enabled: z.boolean().optional(),
    custom_schedule_list: z.array(CustomScheduleSchema).optional(),
    is_enabled: z.boolean().optional(),
    roas_bid_multiplier: z.number().int().optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_name: z.string().describe('Campaign name. Example: "My GMV Max Campaign"'),
    request_id: z.string().describe('Unique request ID for idempotency. Example: "req-123"'),
    schedule_start_time: z.string().describe('Campaign start time in ISO 8601 format. Example: "2024-01-01T00:00:00Z"'),
    schedule_type: z.string().describe('Schedule type. Example: "STARTEND" or "FROM_NOW"'),
    shopping_ads_type: z.string().describe('Shopping ads type. Example: "PRODUCT_SALE"'),
    store_authorized_bc_id: z.string().describe('Store authorized business center ID. Example: "123456"'),
    store_id: z.string().describe('Store ID. Example: "123456"'),
    deep_bid_type: z.string().describe('Deep bid type. Example: "ROI"'),
    optimization_goal: z.string().describe('Optimization goal. Example: "GMV_MAX"'),
    affiliate_posts_enabled: z.boolean().optional(),
    auto_budget_enabled: z.boolean().optional(),
    budget: z.number().optional(),
    custom_anchor_video_list: z.array(CustomAnchorVideoSchema).optional(),
    identity_list: z.array(IdentityListSchema).optional(),
    item_group_ids: z.array(z.string()).optional(),
    item_list: z.array(ItemListSchema).optional(),
    product_specific_type: z.string().optional(),
    product_video_specific_type: z.string().optional(),
    promotion_days: PromotionDaysSchema.optional(),
    roas_bid: z.number().optional(),
    schedule_end_time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            campaign_id: z.string().optional(),
            campaign_name: z.string().optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = z.object({
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional()
});

const action = createAction({
    description: 'Create a GMV Max campaign optimized for gross merchandise value in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1822000988713089
            endpoint: 'campaign/gmv_max/create/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_name: input.campaign_name,
                request_id: input.request_id,
                schedule_start_time: input.schedule_start_time,
                schedule_type: input.schedule_type,
                shopping_ads_type: input.shopping_ads_type,
                store_authorized_bc_id: input.store_authorized_bc_id,
                store_id: input.store_id,
                deep_bid_type: input.deep_bid_type,
                optimization_goal: input.optimization_goal,
                ...(input.affiliate_posts_enabled !== undefined && { affiliate_posts_enabled: input.affiliate_posts_enabled }),
                ...(input.auto_budget_enabled !== undefined && { auto_budget_enabled: input.auto_budget_enabled }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.custom_anchor_video_list !== undefined && { custom_anchor_video_list: input.custom_anchor_video_list }),
                ...(input.identity_list !== undefined && { identity_list: input.identity_list }),
                ...(input.item_group_ids !== undefined && { item_group_ids: input.item_group_ids }),
                ...(input.item_list !== undefined && { item_list: input.item_list }),
                ...(input.product_specific_type !== undefined && { product_specific_type: input.product_specific_type }),
                ...(input.product_video_specific_type !== undefined && { product_video_specific_type: input.product_video_specific_type }),
                ...(input.promotion_days !== undefined && { promotion_days: input.promotion_days }),
                ...(input.roas_bid !== undefined && { roas_bid: input.roas_bid }),
                ...(input.schedule_end_time !== undefined && { schedule_end_time: input.schedule_end_time })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'TikTok API returned an error',
                code: providerResponse.code
            });
        }

        const data = providerResponse.data;

        if (!data) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'TikTok API response did not include campaign data'
            });
        }

        return {
            ...(data.campaign_id !== undefined && { campaign_id: data.campaign_id }),
            ...(data.campaign_name !== undefined && { campaign_name: data.campaign_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
