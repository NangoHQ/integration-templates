import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('The advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('The campaign ID. Example: "1234567890"')
});

const ProviderCampaignSchema = z.object({
    campaign_id: z.string(),
    campaign_name: z.string(),
    advertiser_id: z.string(),
    campaign_type: z.string().nullish(),
    budget: z.number().nullish(),
    budget_mode: z.string().nullish(),
    objective_type: z.string().nullish(),
    objective: z.string().nullish(),
    secondary_status: z.string().nullish(),
    operation_status: z.string().nullish(),
    budget_optimize_on: z.boolean().nullish(),
    bid_type: z.string().nullish(),
    deep_bid_type: z.string().nullish(),
    optimization_goal: z.string().nullish(),
    split_test_variable: z.string().nullish(),
    is_new_structure: z.boolean().nullish(),
    create_time: z.string().nullish(),
    modify_time: z.string().nullish(),
    roas_bid: z.number().nullish(),
    is_smart_performance_campaign: z.boolean().nullish(),
    is_search_campaign: z.boolean().nullish(),
    app_promotion_type: z.string().nullish(),
    rf_campaign_type: z.string().nullish(),
    disable_skan_campaign: z.boolean().nullish(),
    is_advanced_dedicated_campaign: z.boolean().nullish(),
    rta_id: z.string().nullish(),
    rta_bid_enabled: z.boolean().nullish(),
    rta_product_selection_enabled: z.boolean().nullish(),
    campaign_automation_type: z.string().nullish(),
    virtual_objective_type: z.string().nullish(),
    sales_destination: z.string().nullish(),
    catalog_enabled: z.boolean().nullish(),
    special_industries: z.array(z.string()).nullish(),
    app_id: z.string().nullish(),
    placement_type: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            list: z.array(ProviderCampaignSchema),
            page_info: z
                .object({
                    total_number: z.number().optional(),
                    page: z.number().optional(),
                    page_size: z.number().optional(),
                    total_page: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    campaign_id: z.string(),
    campaign_name: z.string(),
    advertiser_id: z.string(),
    campaign_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    objective_type: z.string().optional(),
    objective: z.string().optional(),
    secondary_status: z.string().optional(),
    operation_status: z.string().optional(),
    budget_optimize_on: z.boolean().optional(),
    bid_type: z.string().optional(),
    deep_bid_type: z.string().optional(),
    optimization_goal: z.string().optional(),
    split_test_variable: z.string().optional(),
    is_new_structure: z.boolean().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    roas_bid: z.number().optional(),
    is_smart_performance_campaign: z.boolean().optional(),
    is_search_campaign: z.boolean().optional(),
    app_promotion_type: z.string().optional(),
    rf_campaign_type: z.string().optional(),
    disable_skan_campaign: z.boolean().optional(),
    is_advanced_dedicated_campaign: z.boolean().optional(),
    rta_id: z.string().optional(),
    rta_bid_enabled: z.boolean().optional(),
    rta_product_selection_enabled: z.boolean().optional(),
    campaign_automation_type: z.string().optional(),
    virtual_objective_type: z.string().optional(),
    sales_destination: z.string().optional(),
    catalog_enabled: z.boolean().optional(),
    special_industries: z.array(z.string()).optional(),
    app_id: z.string().optional(),
    placement_type: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single campaign from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1739315828649986
            endpoint: '/campaign/get/',
            params: {
                advertiser_id: input.advertiser_id,
                filtering: JSON.stringify({ campaign_ids: [input.campaign_id] }),
                page_size: '1'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        const campaigns = parsed.data?.list ?? [];
        const campaign = campaigns[0];
        if (!campaign) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                campaign_id: input.campaign_id,
                advertiser_id: input.advertiser_id
            });
        }

        return {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            advertiser_id: campaign.advertiser_id,
            ...(campaign.campaign_type != null && { campaign_type: campaign.campaign_type }),
            ...(campaign.budget != null && { budget: campaign.budget }),
            ...(campaign.budget_mode != null && { budget_mode: campaign.budget_mode }),
            ...(campaign.objective_type != null && { objective_type: campaign.objective_type }),
            ...(campaign.objective != null && { objective: campaign.objective }),
            ...(campaign.secondary_status != null && { secondary_status: campaign.secondary_status }),
            ...(campaign.operation_status != null && { operation_status: campaign.operation_status }),
            ...(campaign.budget_optimize_on != null && { budget_optimize_on: campaign.budget_optimize_on }),
            ...(campaign.bid_type != null && { bid_type: campaign.bid_type }),
            ...(campaign.deep_bid_type != null && { deep_bid_type: campaign.deep_bid_type }),
            ...(campaign.optimization_goal != null && { optimization_goal: campaign.optimization_goal }),
            ...(campaign.split_test_variable != null && { split_test_variable: campaign.split_test_variable }),
            ...(campaign.is_new_structure != null && { is_new_structure: campaign.is_new_structure }),
            ...(campaign.create_time != null && { create_time: campaign.create_time }),
            ...(campaign.modify_time != null && { modify_time: campaign.modify_time }),
            ...(campaign.roas_bid != null && { roas_bid: campaign.roas_bid }),
            ...(campaign.is_smart_performance_campaign != null && { is_smart_performance_campaign: campaign.is_smart_performance_campaign }),
            ...(campaign.is_search_campaign != null && { is_search_campaign: campaign.is_search_campaign }),
            ...(campaign.app_promotion_type != null && { app_promotion_type: campaign.app_promotion_type }),
            ...(campaign.rf_campaign_type != null && { rf_campaign_type: campaign.rf_campaign_type }),
            ...(campaign.disable_skan_campaign != null && { disable_skan_campaign: campaign.disable_skan_campaign }),
            ...(campaign.is_advanced_dedicated_campaign != null && { is_advanced_dedicated_campaign: campaign.is_advanced_dedicated_campaign }),
            ...(campaign.rta_id != null && { rta_id: campaign.rta_id }),
            ...(campaign.rta_bid_enabled != null && { rta_bid_enabled: campaign.rta_bid_enabled }),
            ...(campaign.rta_product_selection_enabled != null && { rta_product_selection_enabled: campaign.rta_product_selection_enabled }),
            ...(campaign.campaign_automation_type != null && { campaign_automation_type: campaign.campaign_automation_type }),
            ...(campaign.virtual_objective_type != null && { virtual_objective_type: campaign.virtual_objective_type }),
            ...(campaign.sales_destination != null && { sales_destination: campaign.sales_destination }),
            ...(campaign.catalog_enabled != null && { catalog_enabled: campaign.catalog_enabled }),
            ...(campaign.special_industries != null && { special_industries: campaign.special_industries }),
            ...(campaign.app_id != null && { app_id: campaign.app_id }),
            ...(campaign.placement_type != null && { placement_type: campaign.placement_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
