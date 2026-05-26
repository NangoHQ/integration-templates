import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "123456789"'),
    campaign_name: z.string().describe('Campaign name. Example: "Summer Sale 2024"'),
    objective_type: z.string().describe('Objective type. Example: "TRAFFIC", "APP_PROMOTION", "LEAD_GENERATION"'),
    app_id: z.string().optional().describe('App ID for app promotion campaigns.'),
    app_promotion_type: z.string().optional().describe('App promotion type. Example: "APP_INSTALL", "APP_RETARGETING"'),
    bid_type: z.string().optional().describe('Bid type. Example: "BID_TYPE_NO_BID", "BID_TYPE_TARGET_COST"'),
    budget: z.number().optional().describe('Campaign budget.'),
    budget_mode: z.string().optional().describe('Budget mode. Example: "BUDGET_MODE_DAY", "BUDGET_MODE_TOTAL"'),
    budget_optimize_on: z.boolean().optional().describe('Whether budget optimization is enabled.'),
    campaign_app_profile_page_state: z.string().optional().describe('Campaign app profile page state.'),
    campaign_product_source: z.string().optional().describe('Campaign product source.'),
    campaign_type: z.string().optional().describe('Campaign type. Example: "REGULAR_CAMPAIGN", "IOS14_CAMPAIGN"'),
    catalog_enabled: z.boolean().optional().describe('Whether catalog is enabled.'),
    deep_bid_type: z.string().optional().describe('Deep bid type.'),
    disable_skan_campaign: z.boolean().optional().describe('Whether to disable SKAN campaign.'),
    internal_channel: z.string().optional().describe('Internal channel.'),
    is_advanced_dedicated_campaign: z.boolean().optional().describe('Whether this is an advanced dedicated campaign.'),
    is_search_campaign: z.boolean().optional().describe('Whether this is a search campaign.'),
    operation_status: z.string().optional().describe('Operation status. Example: "ENABLE", "DISABLE". Default: "ENABLE"'),
    optimization_goal: z.string().optional().describe('Optimization goal.'),
    plugin_partner: z.string().optional().describe('Plugin partner.'),
    po_number: z.string().optional().describe('Purchase order number.'),
    postback_window_mode: z.string().optional().describe('Postback window mode.'),
    request_id: z.string().optional().describe('Request ID for idempotency.'),
    rf_campaign_type: z.string().optional().describe('Reach and frequency campaign type.'),
    roas_bid: z.number().optional().describe('ROAS bid value.'),
    rta_bid_enabled: z.boolean().optional().describe('Whether RTA bid is enabled.'),
    rta_id: z.string().optional().describe('RTA ID.'),
    rta_product_selection_enabled: z.boolean().optional().describe('Whether RTA product selection is enabled.'),
    sales_destination: z.string().optional().describe('Sales destination.'),
    special_industries: z.array(z.string()).optional().describe('Special industries.'),
    virtual_objective_type: z.string().optional().describe('Virtual objective type.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            campaign_id: z.string().optional(),
            campaign_name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Create a campaign in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739318962329602
        const response = await nango.post({
            endpoint: 'campaign/create/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_name: input.campaign_name,
                objective_type: input.objective_type,
                ...(input.app_id !== undefined && { app_id: input.app_id }),
                ...(input.app_promotion_type !== undefined && { app_promotion_type: input.app_promotion_type }),
                ...(input.bid_type !== undefined && { bid_type: input.bid_type }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.budget_mode !== undefined && { budget_mode: input.budget_mode }),
                ...(input.budget_optimize_on !== undefined && { budget_optimize_on: input.budget_optimize_on }),
                ...(input.campaign_app_profile_page_state !== undefined && { campaign_app_profile_page_state: input.campaign_app_profile_page_state }),
                ...(input.campaign_product_source !== undefined && { campaign_product_source: input.campaign_product_source }),
                ...(input.campaign_type !== undefined && { campaign_type: input.campaign_type }),
                ...(input.catalog_enabled !== undefined && { catalog_enabled: input.catalog_enabled }),
                ...(input.deep_bid_type !== undefined && { deep_bid_type: input.deep_bid_type }),
                ...(input.disable_skan_campaign !== undefined && { disable_skan_campaign: input.disable_skan_campaign }),
                ...(input.internal_channel !== undefined && { internal_channel: input.internal_channel }),
                ...(input.is_advanced_dedicated_campaign !== undefined && { is_advanced_dedicated_campaign: input.is_advanced_dedicated_campaign }),
                ...(input.is_search_campaign !== undefined && { is_search_campaign: input.is_search_campaign }),
                ...(input.operation_status !== undefined && { operation_status: input.operation_status }),
                ...(input.optimization_goal !== undefined && { optimization_goal: input.optimization_goal }),
                ...(input.plugin_partner !== undefined && { plugin_partner: input.plugin_partner }),
                ...(input.po_number !== undefined && { po_number: input.po_number }),
                ...(input.postback_window_mode !== undefined && { postback_window_mode: input.postback_window_mode }),
                ...(input.request_id !== undefined && { request_id: input.request_id }),
                ...(input.rf_campaign_type !== undefined && { rf_campaign_type: input.rf_campaign_type }),
                ...(input.roas_bid !== undefined && { roas_bid: input.roas_bid }),
                ...(input.rta_bid_enabled !== undefined && { rta_bid_enabled: input.rta_bid_enabled }),
                ...(input.rta_id !== undefined && { rta_id: input.rta_id }),
                ...(input.rta_product_selection_enabled !== undefined && { rta_product_selection_enabled: input.rta_product_selection_enabled }),
                ...(input.sales_destination !== undefined && { sales_destination: input.sales_destination }),
                ...(input.special_industries !== undefined && { special_industries: input.special_industries }),
                ...(input.virtual_objective_type !== undefined && { virtual_objective_type: input.virtual_objective_type })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message,
            request_id: providerResponse.request_id,
            ...(providerResponse.data?.campaign_id != null && { campaign_id: providerResponse.data.campaign_id }),
            ...(providerResponse.data?.campaign_name != null && { campaign_name: providerResponse.data.campaign_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
