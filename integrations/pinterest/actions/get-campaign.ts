import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    campaign_id: z.string().describe('Campaign ID. Example: "626759223935"')
});

const TrackingUrlsSchema = z.object({}).passthrough().nullable().optional();

const BidOptionsSchema = z.object({}).passthrough().nullable().optional();

const IntendedPromotionTypeSchema = z.string().nullable().optional();

const PerformancePlusCampaignSettingsSchema = z.object({}).passthrough().nullable().optional();

const ProviderCampaignSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    objective_type: z.string(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    start_time: z.number().nullable().optional(),
    end_time: z.number().nullable().optional(),
    daily_spend_cap: z.number().nullable().optional(),
    lifetime_spend_cap: z.number().nullable().optional(),
    default_ad_group_budget_in_micro_currency: z.number().nullable().optional(),
    order_line_id: z.string().nullable().optional(),
    is_automated_campaign: z.boolean().nullable().optional(),
    is_campaign_budget_optimization: z.boolean().nullable().optional(),
    is_flexible_daily_budgets: z.boolean().nullable().optional(),
    is_ltv_optimized: z.boolean().optional(),
    is_performance_plus: z.boolean().optional(),
    is_top_of_search: z.boolean().optional(),
    is_carting: z.boolean().optional(),
    type: z.string().optional(),
    summary_status: z.string().optional(),
    tracking_urls: TrackingUrlsSchema,
    bid_options: BidOptionsSchema,
    intended_promotion_type: IntendedPromotionTypeSchema,
    performance_plus_campaign_settings: PerformancePlusCampaignSettingsSchema
});

const OutputSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    objective_type: z.string(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    start_time: z.number().optional(),
    end_time: z.number().optional(),
    daily_spend_cap: z.number().optional(),
    lifetime_spend_cap: z.number().optional(),
    default_ad_group_budget_in_micro_currency: z.number().optional(),
    order_line_id: z.string().optional(),
    is_automated_campaign: z.boolean().optional(),
    is_campaign_budget_optimization: z.boolean().optional(),
    is_flexible_daily_budgets: z.boolean().optional(),
    is_ltv_optimized: z.boolean().optional(),
    is_performance_plus: z.boolean().optional(),
    is_top_of_search: z.boolean().optional(),
    is_carting: z.boolean().optional(),
    type: z.string().optional(),
    summary_status: z.string().optional(),
    tracking_urls: z.object({}).passthrough().optional(),
    bid_options: z.object({}).passthrough().optional(),
    intended_promotion_type: z.string().optional(),
    performance_plus_campaign_settings: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Retrieve a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/campaigns/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/campaigns/${encodeURIComponent(input.campaign_id)}`,
            retries: 3
        });

        const providerCampaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: providerCampaign.id,
            ...(providerCampaign.ad_account_id !== undefined && { ad_account_id: providerCampaign.ad_account_id }),
            ...(providerCampaign.name !== undefined && { name: providerCampaign.name }),
            ...(providerCampaign.status !== undefined && { status: providerCampaign.status }),
            objective_type: providerCampaign.objective_type,
            ...(providerCampaign.created_time !== undefined && { created_time: providerCampaign.created_time }),
            ...(providerCampaign.updated_time !== undefined && { updated_time: providerCampaign.updated_time }),
            ...(providerCampaign.start_time !== undefined && providerCampaign.start_time !== null && { start_time: providerCampaign.start_time }),
            ...(providerCampaign.end_time !== undefined && providerCampaign.end_time !== null && { end_time: providerCampaign.end_time }),
            ...(providerCampaign.daily_spend_cap !== undefined &&
                providerCampaign.daily_spend_cap !== null && { daily_spend_cap: providerCampaign.daily_spend_cap }),
            ...(providerCampaign.lifetime_spend_cap !== undefined &&
                providerCampaign.lifetime_spend_cap !== null && { lifetime_spend_cap: providerCampaign.lifetime_spend_cap }),
            ...(providerCampaign.default_ad_group_budget_in_micro_currency !== undefined &&
                providerCampaign.default_ad_group_budget_in_micro_currency !== null && {
                    default_ad_group_budget_in_micro_currency: providerCampaign.default_ad_group_budget_in_micro_currency
                }),
            ...(providerCampaign.order_line_id !== undefined && providerCampaign.order_line_id !== null && { order_line_id: providerCampaign.order_line_id }),
            ...(providerCampaign.is_automated_campaign !== undefined &&
                providerCampaign.is_automated_campaign !== null && { is_automated_campaign: providerCampaign.is_automated_campaign }),
            ...(providerCampaign.is_campaign_budget_optimization !== undefined &&
                providerCampaign.is_campaign_budget_optimization !== null && {
                    is_campaign_budget_optimization: providerCampaign.is_campaign_budget_optimization
                }),
            ...(providerCampaign.is_flexible_daily_budgets !== undefined &&
                providerCampaign.is_flexible_daily_budgets !== null && { is_flexible_daily_budgets: providerCampaign.is_flexible_daily_budgets }),
            ...(providerCampaign.is_ltv_optimized !== undefined && { is_ltv_optimized: providerCampaign.is_ltv_optimized }),
            ...(providerCampaign.is_performance_plus !== undefined && { is_performance_plus: providerCampaign.is_performance_plus }),
            ...(providerCampaign.is_top_of_search !== undefined && { is_top_of_search: providerCampaign.is_top_of_search }),
            ...(providerCampaign.is_carting !== undefined && { is_carting: providerCampaign.is_carting }),
            ...(providerCampaign.type !== undefined && { type: providerCampaign.type }),
            ...(providerCampaign.summary_status !== undefined && { summary_status: providerCampaign.summary_status }),
            ...(providerCampaign.tracking_urls !== undefined && providerCampaign.tracking_urls !== null && { tracking_urls: providerCampaign.tracking_urls }),
            ...(providerCampaign.bid_options !== undefined && providerCampaign.bid_options !== null && { bid_options: providerCampaign.bid_options }),
            ...(providerCampaign.intended_promotion_type !== undefined &&
                providerCampaign.intended_promotion_type !== null && {
                    intended_promotion_type: providerCampaign.intended_promotion_type
                }),
            ...(providerCampaign.performance_plus_campaign_settings !== undefined &&
                providerCampaign.performance_plus_campaign_settings !== null && {
                    performance_plus_campaign_settings: providerCampaign.performance_plus_campaign_settings
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
