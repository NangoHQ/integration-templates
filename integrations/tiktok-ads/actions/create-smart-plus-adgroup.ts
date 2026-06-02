import { z } from 'zod';
import { createAction } from 'nango';

const TargetingSpecSchema = z.object({
    actions: z.array(z.object({}).passthrough()).optional(),
    age_groups: z.array(z.string()).optional(),
    audience_ids: z.array(z.string()).optional(),
    blocked_pangle_app_ids: z.array(z.string()).optional(),
    carrier_ids: z.array(z.string()).optional(),
    device_model_ids: z.array(z.string()).optional(),
    device_price_ranges: z.array(z.number()).optional(),
    excluded_audience_ids: z.array(z.string()).optional(),
    excluded_pangle_audience_package_ids: z.array(z.string()).optional(),
    gender: z.string().optional(),
    household_income: z.array(z.string()).optional(),
    included_pangle_audience_package_ids: z.array(z.string()).optional(),
    interest_category_ids: z.array(z.string()).optional(),
    interest_keyword_ids: z.array(z.string()).optional(),
    isp_ids: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    location_ids: z.array(z.string()).optional(),
    min_android_version: z.string().optional(),
    min_ios_version: z.string().optional(),
    network_types: z.array(z.string()).optional(),
    operating_systems: z.array(z.string()).optional(),
    purchase_intention_keyword_ids: z.array(z.string()).optional(),
    saved_audience_id: z.string().optional(),
    smart_audience_enabled: z.boolean().optional(),
    smart_interest_behavior_enabled: z.boolean().optional(),
    spc_audience_age: z.string().optional(),
    spending_power: z.string().optional(),
    zipcode_ids: z.array(z.string()).optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('Campaign ID. Example: "1866249031553154"'),
    adgroup_name: z.string().describe('Ad group name.'),
    billing_event: z.string().describe('Billing event. Example: "CPC"'),
    optimization_goal: z.string().describe('Optimization goal. Example: "CLICK"'),
    promotion_type: z.string().describe('Promotion type. Example: "WEBSITE"'),
    request_id: z.string().describe('Request ID for idempotency. Example: "req-123"'),
    schedule_start_time: z.string().describe('Schedule start time. Format: YYYY-MM-DD HH:MM:SS'),
    schedule_type: z.string().describe('Schedule type. Example: "SCHEDULE_START_END"'),
    targeting_spec: TargetingSpecSchema.describe('Targeting specifications.'),
    app_id: z.string().optional(),
    bid_price: z.number().optional(),
    bid_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    catalog_authorized_bc_id: z.string().optional(),
    catalog_id: z.string().optional(),
    click_attribution_window: z.string().optional(),
    comment_disabled: z.boolean().optional(),
    conversion_bid_price: z.number().optional(),
    custom_conversion_id: z.string().optional(),
    dayparting: z.string().optional(),
    deep_bid_type: z.string().optional(),
    deep_cpabid: z.number().optional(),
    deep_funnel_event_source: z.string().optional(),
    deep_funnel_event_source_id: z.string().optional(),
    deep_funnel_optimization_event: z.string().optional(),
    deep_funnel_optimization_status: z.string().optional(),
    engaged_view_attribution_window: z.string().optional(),
    identity_authorized_bc_id: z.string().optional(),
    identity_id: z.string().optional(),
    identity_type: z.string().optional(),
    message_event_set_id: z.string().optional(),
    messaging_app_account_id: z.string().optional(),
    messaging_app_type: z.string().optional(),
    min_budget: z.number().optional(),
    movie_premiere_date: z.string().optional(),
    open_api_partner: z.string().optional(),
    operation_status: z.string().optional(),
    optimization_event: z.string().optional(),
    phone_info: z.object({}).passthrough().optional(),
    pixel_id: z.string().optional(),
    placement_type: z.string().optional(),
    placements: z.array(z.string()).optional(),
    product_source: z.string().optional(),
    promotion_target_type: z.string().optional(),
    promotion_website_type: z.string().optional(),
    roas_bid: z.number().optional(),
    schedule_end_time: z.string().optional(),
    share_disabled: z.boolean().optional(),
    suggestion_audience_enabled: z.boolean().optional(),
    targeting_optimization_mode: z.string().optional(),
    vbo_window: z.string().optional(),
    video_download_disabled: z.boolean().optional(),
    view_attribution_window: z.string().optional(),
    zalo_id_type: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            adgroup_id: z.string().optional(),
            list: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    adgroup_id: z.string().optional(),
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Create a Smart+ ad group in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-smart-plus-adgroup',
        group: 'Ad Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            advertiser_id: input.advertiser_id,
            campaign_id: input.campaign_id,
            adgroup_name: input.adgroup_name,
            billing_event: input.billing_event,
            optimization_goal: input.optimization_goal,
            promotion_type: input.promotion_type,
            request_id: input.request_id,
            schedule_start_time: input.schedule_start_time,
            schedule_type: input.schedule_type,
            targeting_spec: input.targeting_spec,
            ...(input.app_id !== undefined && { app_id: input.app_id }),
            ...(input.bid_price !== undefined && { bid_price: input.bid_price }),
            ...(input.bid_type !== undefined && { bid_type: input.bid_type }),
            ...(input.budget !== undefined && { budget: input.budget }),
            ...(input.budget_mode !== undefined && { budget_mode: input.budget_mode }),
            ...(input.catalog_authorized_bc_id !== undefined && { catalog_authorized_bc_id: input.catalog_authorized_bc_id }),
            ...(input.catalog_id !== undefined && { catalog_id: input.catalog_id }),
            ...(input.click_attribution_window !== undefined && { click_attribution_window: input.click_attribution_window }),
            ...(input.comment_disabled !== undefined && { comment_disabled: input.comment_disabled }),
            ...(input.conversion_bid_price !== undefined && { conversion_bid_price: input.conversion_bid_price }),
            ...(input.custom_conversion_id !== undefined && { custom_conversion_id: input.custom_conversion_id }),
            ...(input.dayparting !== undefined && { dayparting: input.dayparting }),
            ...(input.deep_bid_type !== undefined && { deep_bid_type: input.deep_bid_type }),
            ...(input.deep_cpabid !== undefined && { deep_cpabid: input.deep_cpabid }),
            ...(input.deep_funnel_event_source !== undefined && { deep_funnel_event_source: input.deep_funnel_event_source }),
            ...(input.deep_funnel_event_source_id !== undefined && { deep_funnel_event_source_id: input.deep_funnel_event_source_id }),
            ...(input.deep_funnel_optimization_event !== undefined && { deep_funnel_optimization_event: input.deep_funnel_optimization_event }),
            ...(input.deep_funnel_optimization_status !== undefined && { deep_funnel_optimization_status: input.deep_funnel_optimization_status }),
            ...(input.engaged_view_attribution_window !== undefined && { engaged_view_attribution_window: input.engaged_view_attribution_window }),
            ...(input.identity_authorized_bc_id !== undefined && { identity_authorized_bc_id: input.identity_authorized_bc_id }),
            ...(input.identity_id !== undefined && { identity_id: input.identity_id }),
            ...(input.identity_type !== undefined && { identity_type: input.identity_type }),
            ...(input.message_event_set_id !== undefined && { message_event_set_id: input.message_event_set_id }),
            ...(input.messaging_app_account_id !== undefined && { messaging_app_account_id: input.messaging_app_account_id }),
            ...(input.messaging_app_type !== undefined && { messaging_app_type: input.messaging_app_type }),
            ...(input.min_budget !== undefined && { min_budget: input.min_budget }),
            ...(input.movie_premiere_date !== undefined && { movie_premiere_date: input.movie_premiere_date }),
            ...(input.open_api_partner !== undefined && { open_api_partner: input.open_api_partner }),
            ...(input.operation_status !== undefined && { operation_status: input.operation_status }),
            ...(input.optimization_event !== undefined && { optimization_event: input.optimization_event }),
            ...(input.phone_info !== undefined && { phone_info: input.phone_info }),
            ...(input.pixel_id !== undefined && { pixel_id: input.pixel_id }),
            ...(input.placement_type !== undefined && { placement_type: input.placement_type }),
            ...(input.placements !== undefined && { placements: input.placements }),
            ...(input.product_source !== undefined && { product_source: input.product_source }),
            ...(input.promotion_target_type !== undefined && { promotion_target_type: input.promotion_target_type }),
            ...(input.promotion_website_type !== undefined && { promotion_website_type: input.promotion_website_type }),
            ...(input.roas_bid !== undefined && { roas_bid: input.roas_bid }),
            ...(input.schedule_end_time !== undefined && { schedule_end_time: input.schedule_end_time }),
            ...(input.share_disabled !== undefined && { share_disabled: input.share_disabled }),
            ...(input.suggestion_audience_enabled !== undefined && { suggestion_audience_enabled: input.suggestion_audience_enabled }),
            ...(input.targeting_optimization_mode !== undefined && { targeting_optimization_mode: input.targeting_optimization_mode }),
            ...(input.vbo_window !== undefined && { vbo_window: input.vbo_window }),
            ...(input.video_download_disabled !== undefined && { video_download_disabled: input.video_download_disabled }),
            ...(input.view_attribution_window !== undefined && { view_attribution_window: input.view_attribution_window }),
            ...(input.zalo_id_type !== undefined && { zalo_id_type: input.zalo_id_type })
        };

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739499616346114
            endpoint: 'smart_plus/adgroup/create/',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            adgroup_id: providerResponse.data?.adgroup_id,
            code: providerResponse.code,
            message: providerResponse.message,
            request_id: providerResponse.request_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
