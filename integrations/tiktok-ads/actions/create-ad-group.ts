import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('Campaign ID to associate the ad group with. Example: "1234567890"'),
    adgroup_name: z.string().describe('Name of the ad group. Example: "My Ad Group"'),
    billing_event: z.string().describe('Billing event for the ad group. Example: "CLICK"'),
    budget: z.number().describe('Budget amount for the ad group. Example: 100'),
    budget_mode: z.string().describe('Budget mode. Example: "BUDGET_MODE_DAY"'),
    optimization_goal: z.string().describe('Optimization goal. Example: "CLICK"'),
    pacing: z.string().describe('Pacing type. Example: "PACING_MODE_SMOOTH"'),
    schedule_start_time: z.string().describe('Schedule start time in ISO 8601 format. Example: "2026-05-26T00:00:00Z"'),
    schedule_type: z.string().describe('Schedule type. Example: "SCHEDULE_START_END"'),
    placements: z.array(z.string()).optional().describe('List of placement IDs. Example: ["PLACEMENT_TIKTOK"]'),
    placement_type: z.string().optional().describe('Placement type. Example: "PLACEMENT_TYPE_NORMAL"'),
    age_groups: z.array(z.string()).optional().describe('Age groups to target. Example: ["AGE_18_24", "AGE_25_34"]'),
    gender: z.string().optional().describe('Gender targeting. Example: "GENDER_UNLIMITED"'),
    languages: z.array(z.string()).optional().describe('Language codes. Example: ["en"]'),
    location_ids: z.array(z.string()).optional().describe('Location IDs. Example: ["1224"]'),
    operating_systems: z.array(z.string()).optional().describe('Operating systems. Example: ["ANDROID", "IOS"]'),
    bid_type: z.string().optional().describe('Bid type. Example: "BID_TYPE_NO_BID"'),
    bid_price: z.number().optional().describe('Bid price. Example: 0.01'),
    deep_bid_type: z.string().optional().describe('Deep bid type.'),
    deep_cpa_bid: z.number().optional().describe('Deep CPA bid.'),
    frequency: z.number().optional().describe('Frequency cap.'),
    frequency_schedule: z.number().optional().describe('Frequency schedule in days.'),
    comment_disabled: z.boolean().optional().describe('Whether comments are disabled.'),
    share_disabled: z.boolean().optional().describe('Whether sharing is disabled.'),
    video_download_disabled: z.boolean().optional().describe('Whether video download is disabled.'),
    brand_safety_type: z.string().optional().describe('Brand safety type. Example: "NO_BRAND_SAFETY"'),
    operation_status: z.string().optional().describe('Operation status. Example: "ENABLE"'),
    is_hfss: z.boolean().optional().describe('Whether the ad group is for HFSS products.'),
    skip_learning_phase: z.boolean().optional().describe('Whether to skip the learning phase.'),
    pixel_id: z.string().optional().describe('Pixel ID for tracking.'),
    custom_conversion_id: z.string().optional().describe('Custom conversion ID.'),
    app_id: z.string().optional().describe('App ID for app promotion.'),
    schedule_end_time: z.string().optional().describe('Schedule end time in ISO 8601 format.'),
    audience_ids: z.array(z.string()).optional().describe('Audience IDs to include.'),
    excluded_audience_ids: z.array(z.string()).optional().describe('Audience IDs to exclude.'),
    interest_category_ids: z.array(z.string()).optional().describe('Interest category IDs.'),
    interest_keyword_ids: z.array(z.string()).optional().describe('Interest keyword IDs.'),
    promotion_type: z.string().optional().describe('Promotion type. Example: "WEBSITE"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            adgroup_id: z.string().nullable().optional(),
            adgroup_name: z.string().nullable().optional(),
            campaign_id: z.string().nullable().optional(),
            advertiser_id: z.string().nullable().optional(),
            billing_event: z.string().nullable().optional(),
            budget: z.number().nullable().optional(),
            budget_mode: z.string().nullable().optional(),
            optimization_goal: z.string().nullable().optional(),
            pacing: z.string().nullable().optional(),
            schedule_start_time: z.string().nullable().optional(),
            schedule_type: z.string().nullable().optional(),
            placements: z.array(z.string()).nullable().optional(),
            placement_type: z.string().nullable().optional(),
            age_groups: z.array(z.string()).nullable().optional(),
            gender: z.string().nullable().optional(),
            languages: z.array(z.string()).nullable().optional(),
            location_ids: z.array(z.string()).nullable().optional(),
            operating_systems: z.array(z.string()).nullable().optional(),
            bid_type: z.string().nullable().optional(),
            bid_price: z.number().nullable().optional(),
            deep_bid_type: z.string().nullable().optional(),
            deep_cpa_bid: z.number().nullable().optional(),
            frequency: z.number().nullable().optional(),
            frequency_schedule: z.number().nullable().optional(),
            comment_disabled: z.boolean().nullable().optional(),
            share_disabled: z.boolean().nullable().optional(),
            video_download_disabled: z.boolean().nullable().optional(),
            brand_safety_type: z.string().nullable().optional(),
            operation_status: z.string().nullable().optional(),
            is_hfss: z.boolean().nullable().optional(),
            skip_learning_phase: z.boolean().nullable().optional(),
            pixel_id: z.string().nullable().optional(),
            custom_conversion_id: z.string().nullable().optional(),
            app_id: z.string().nullable().optional(),
            schedule_end_time: z.string().nullable().optional(),
            audience_ids: z.array(z.string()).nullable().optional(),
            excluded_audience_ids: z.array(z.string()).nullable().optional(),
            interest_category_ids: z.array(z.string()).nullable().optional(),
            interest_keyword_ids: z.array(z.string()).nullable().optional(),
            promotion_type: z.string().nullable().optional(),
            create_time: z.string().nullable().optional(),
            modify_time: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    adgroup_id: z.string().optional(),
    adgroup_name: z.string().optional(),
    campaign_id: z.string().optional(),
    advertiser_id: z.string().optional(),
    billing_event: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    optimization_goal: z.string().optional(),
    pacing: z.string().optional(),
    schedule_start_time: z.string().optional(),
    schedule_type: z.string().optional(),
    placements: z.array(z.string()).optional(),
    placement_type: z.string().optional(),
    age_groups: z.array(z.string()).optional(),
    gender: z.string().optional(),
    languages: z.array(z.string()).optional(),
    location_ids: z.array(z.string()).optional(),
    operating_systems: z.array(z.string()).optional(),
    bid_type: z.string().optional(),
    bid_price: z.number().optional(),
    deep_bid_type: z.string().optional(),
    deep_cpa_bid: z.number().optional(),
    frequency: z.number().optional(),
    frequency_schedule: z.number().optional(),
    comment_disabled: z.boolean().optional(),
    share_disabled: z.boolean().optional(),
    video_download_disabled: z.boolean().optional(),
    brand_safety_type: z.string().optional(),
    operation_status: z.string().optional(),
    is_hfss: z.boolean().optional(),
    skip_learning_phase: z.boolean().optional(),
    pixel_id: z.string().optional(),
    custom_conversion_id: z.string().optional(),
    app_id: z.string().optional(),
    schedule_end_time: z.string().optional(),
    audience_ids: z.array(z.string()).optional(),
    excluded_audience_ids: z.array(z.string()).optional(),
    interest_category_ids: z.array(z.string()).optional(),
    interest_keyword_ids: z.array(z.string()).optional(),
    promotion_type: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const action = createAction({
    description: 'Create an ad group in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-ad-group',
        group: 'Ad Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['adgroup.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739499616346114
        const response = await nango.post({
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            endpoint: 'adgroup/create/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_id: input.campaign_id,
                adgroup_name: input.adgroup_name,
                billing_event: input.billing_event,
                budget: input.budget,
                budget_mode: input.budget_mode,
                optimization_goal: input.optimization_goal,
                pacing: input.pacing,
                schedule_start_time: input.schedule_start_time,
                schedule_type: input.schedule_type,
                ...(input.placements !== undefined && { placements: input.placements }),
                ...(input.placement_type !== undefined && { placement_type: input.placement_type }),
                ...(input.age_groups !== undefined && { age_groups: input.age_groups }),
                ...(input.gender !== undefined && { gender: input.gender }),
                ...(input.languages !== undefined && { languages: input.languages }),
                ...(input.location_ids !== undefined && { location_ids: input.location_ids }),
                ...(input.operating_systems !== undefined && { operating_systems: input.operating_systems }),
                ...(input.bid_type !== undefined && { bid_type: input.bid_type }),
                ...(input.bid_price !== undefined && { bid_price: input.bid_price }),
                ...(input.deep_bid_type !== undefined && { deep_bid_type: input.deep_bid_type }),
                ...(input.deep_cpa_bid !== undefined && { deep_cpa_bid: input.deep_cpa_bid }),
                ...(input.frequency !== undefined && { frequency: input.frequency }),
                ...(input.frequency_schedule !== undefined && { frequency_schedule: input.frequency_schedule }),
                ...(input.comment_disabled !== undefined && { comment_disabled: input.comment_disabled }),
                ...(input.share_disabled !== undefined && { share_disabled: input.share_disabled }),
                ...(input.video_download_disabled !== undefined && { video_download_disabled: input.video_download_disabled }),
                ...(input.brand_safety_type !== undefined && { brand_safety_type: input.brand_safety_type }),
                ...(input.operation_status !== undefined && { operation_status: input.operation_status }),
                ...(input.is_hfss !== undefined && { is_hfss: input.is_hfss }),
                ...(input.skip_learning_phase !== undefined && { skip_learning_phase: input.skip_learning_phase }),
                ...(input.pixel_id !== undefined && { pixel_id: input.pixel_id }),
                ...(input.custom_conversion_id !== undefined && { custom_conversion_id: input.custom_conversion_id }),
                ...(input.app_id !== undefined && { app_id: input.app_id }),
                ...(input.schedule_end_time !== undefined && { schedule_end_time: input.schedule_end_time }),
                ...(input.audience_ids !== undefined && { audience_ids: input.audience_ids }),
                ...(input.excluded_audience_ids !== undefined && { excluded_audience_ids: input.excluded_audience_ids }),
                ...(input.interest_category_ids !== undefined && { interest_category_ids: input.interest_category_ids }),
                ...(input.interest_keyword_ids !== undefined && { interest_keyword_ids: input.interest_keyword_ids }),
                ...(input.promotion_type !== undefined && { promotion_type: input.promotion_type })
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_response_mismatch',
                message: 'Unexpected response format from TikTok API',
                details: parsed.error.format()
            });
        }

        const providerData = parsed.data.data;
        if (parsed.data.code !== 0 || !providerData) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.message || 'TikTok API returned an error',
                code: parsed.data.code
            });
        }

        return {
            ...(providerData.adgroup_id != null && { adgroup_id: providerData.adgroup_id }),
            ...(providerData.adgroup_name != null && { adgroup_name: providerData.adgroup_name }),
            ...(providerData.campaign_id != null && { campaign_id: providerData.campaign_id }),
            ...(providerData.advertiser_id != null && { advertiser_id: providerData.advertiser_id }),
            ...(providerData.billing_event != null && { billing_event: providerData.billing_event }),
            ...(providerData.budget != null && { budget: providerData.budget }),
            ...(providerData.budget_mode != null && { budget_mode: providerData.budget_mode }),
            ...(providerData.optimization_goal != null && { optimization_goal: providerData.optimization_goal }),
            ...(providerData.pacing != null && { pacing: providerData.pacing }),
            ...(providerData.schedule_start_time != null && { schedule_start_time: providerData.schedule_start_time }),
            ...(providerData.schedule_type != null && { schedule_type: providerData.schedule_type }),
            ...(providerData.placements != null && { placements: providerData.placements }),
            ...(providerData.placement_type != null && { placement_type: providerData.placement_type }),
            ...(providerData.age_groups != null && { age_groups: providerData.age_groups }),
            ...(providerData.gender != null && { gender: providerData.gender }),
            ...(providerData.languages != null && { languages: providerData.languages }),
            ...(providerData.location_ids != null && { location_ids: providerData.location_ids }),
            ...(providerData.operating_systems != null && { operating_systems: providerData.operating_systems }),
            ...(providerData.bid_type != null && { bid_type: providerData.bid_type }),
            ...(providerData.bid_price != null && { bid_price: providerData.bid_price }),
            ...(providerData.deep_bid_type != null && { deep_bid_type: providerData.deep_bid_type }),
            ...(providerData.deep_cpa_bid != null && { deep_cpa_bid: providerData.deep_cpa_bid }),
            ...(providerData.frequency != null && { frequency: providerData.frequency }),
            ...(providerData.frequency_schedule != null && { frequency_schedule: providerData.frequency_schedule }),
            ...(providerData.comment_disabled != null && { comment_disabled: providerData.comment_disabled }),
            ...(providerData.share_disabled != null && { share_disabled: providerData.share_disabled }),
            ...(providerData.video_download_disabled != null && { video_download_disabled: providerData.video_download_disabled }),
            ...(providerData.brand_safety_type != null && { brand_safety_type: providerData.brand_safety_type }),
            ...(providerData.operation_status != null && { operation_status: providerData.operation_status }),
            ...(providerData.is_hfss != null && { is_hfss: providerData.is_hfss }),
            ...(providerData.skip_learning_phase != null && { skip_learning_phase: providerData.skip_learning_phase }),
            ...(providerData.pixel_id != null && { pixel_id: providerData.pixel_id }),
            ...(providerData.custom_conversion_id != null && { custom_conversion_id: providerData.custom_conversion_id }),
            ...(providerData.app_id != null && { app_id: providerData.app_id }),
            ...(providerData.schedule_end_time != null && { schedule_end_time: providerData.schedule_end_time }),
            ...(providerData.audience_ids != null && { audience_ids: providerData.audience_ids }),
            ...(providerData.excluded_audience_ids != null && { excluded_audience_ids: providerData.excluded_audience_ids }),
            ...(providerData.interest_category_ids != null && { interest_category_ids: providerData.interest_category_ids }),
            ...(providerData.interest_keyword_ids != null && { interest_keyword_ids: providerData.interest_keyword_ids }),
            ...(providerData.promotion_type != null && { promotion_type: providerData.promotion_type }),
            ...(providerData.create_time != null && { create_time: providerData.create_time }),
            ...(providerData.modify_time != null && { modify_time: providerData.modify_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
