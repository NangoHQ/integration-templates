import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const TargetingSpecActionSchema = z.object({
    action_category_ids: z.array(z.string()).optional(),
    action_period: z.number().optional(),
    action_scene: z.string().optional(),
    video_user_actions: z.array(z.string()).optional()
});

const TargetingSpecSchema = z.object({
    actions: z.array(TargetingSpecActionSchema).optional(),
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
    adgroup_id: z.string().describe('Smart+ Ad Group ID. Example: "1866248998099217"'),
    adgroup_name: z.string().optional(),
    bid_price: z.number().optional(),
    budget: z.number().optional(),
    comment_disabled: z.boolean().optional(),
    conversion_bid_price: z.number().optional(),
    dayparting: z.string().optional(),
    min_budget: z.number().optional(),
    movie_premiere_date: z.string().optional(),
    pacing: z.string().optional(),
    roas_bid: z.number().optional(),
    schedule_end_time: z.string().optional(),
    schedule_start_time: z.string().optional(),
    schedule_type: z.string().optional(),
    share_disabled: z.boolean().optional(),
    suggestion_audience_enabled: z.boolean().optional(),
    targeting_optimization_mode: z.string().optional(),
    targeting_spec: TargetingSpecSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            adgroup_id: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    adgroup_id: z.string(),
    message: z.string().optional(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Update a Smart+ ad group in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1792849887297537
            endpoint: 'smart_plus/adgroup/update/',
            data: {
                advertiser_id: input.advertiser_id,
                adgroup_id: input.adgroup_id,
                ...(input.adgroup_name !== undefined && { adgroup_name: input.adgroup_name }),
                ...(input.bid_price !== undefined && { bid_price: input.bid_price }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.comment_disabled !== undefined && { comment_disabled: input.comment_disabled }),
                ...(input.conversion_bid_price !== undefined && { conversion_bid_price: input.conversion_bid_price }),
                ...(input.dayparting !== undefined && { dayparting: input.dayparting }),
                ...(input.min_budget !== undefined && { min_budget: input.min_budget }),
                ...(input.movie_premiere_date !== undefined && { movie_premiere_date: input.movie_premiere_date }),
                ...(input.pacing !== undefined && { pacing: input.pacing }),
                ...(input.roas_bid !== undefined && { roas_bid: input.roas_bid }),
                ...(input.schedule_end_time !== undefined && { schedule_end_time: input.schedule_end_time }),
                ...(input.schedule_start_time !== undefined && { schedule_start_time: input.schedule_start_time }),
                ...(input.schedule_type !== undefined && { schedule_type: input.schedule_type }),
                ...(input.share_disabled !== undefined && { share_disabled: input.share_disabled }),
                ...(input.suggestion_audience_enabled !== undefined && { suggestion_audience_enabled: input.suggestion_audience_enabled }),
                ...(input.targeting_optimization_mode !== undefined && { targeting_optimization_mode: input.targeting_optimization_mode }),
                ...(input.targeting_spec !== undefined && { targeting_spec: input.targeting_spec })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.message || 'Unknown error from TikTok API',
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        if (!providerResponse.data?.adgroup_id) {
            throw new nango.ActionError({
                type: 'missing_response_data',
                message: 'Unexpected response: adgroup_id not found in response data',
                request_id: providerResponse.request_id
            });
        }

        return {
            adgroup_id: providerResponse.data.adgroup_id,
            ...(providerResponse.message != null && { message: providerResponse.message }),
            ...(providerResponse.request_id != null && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
