import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_name: z.string().describe('Campaign name. Example: "Smart+ Campaign"'),
    objective_type: z.string().describe('Campaign objective type. Example: "WEB_CONVERSIONS"'),
    request_id: z.string().describe('Unique request ID for idempotency. Example: "req-123"'),
    app_id: z.string().optional().describe('App ID. Example: "123456"'),
    app_promotion_type: z.string().optional().describe('App promotion type. Example: "APP_INSTALL"'),
    bid_align_type: z.string().optional().describe('Bid align type. Example: "BID_ALIGN"'),
    budget: z.number().optional().describe('Campaign budget. Example: 100'),
    budget_mode: z.string().optional().describe('Budget mode. Example: "BUDGET_MODE_DAY"'),
    budget_optimize_on: z.boolean().optional().describe('Whether budget optimization is enabled.'),
    campaign_app_profile_page_state: z.string().optional().describe('Campaign app profile page state.'),
    campaign_type: z.string().optional().describe('Campaign type.'),
    catalog_enabled: z.boolean().optional().describe('Whether catalog is enabled.'),
    catalog_type: z.string().optional().describe('Catalog type.'),
    disable_skan_campaign: z.boolean().optional().describe('Whether to disable SKAN campaign.'),
    is_advanced_dedicated_campaign: z.boolean().optional().describe('Whether this is an advanced dedicated campaign.'),
    is_promotional_campaign: z.boolean().optional().describe('Whether this is a promotional campaign.'),
    open_api_partner: z.string().optional().describe('Open API partner name.'),
    operation_status: z.string().optional().describe('Operation status. Example: "ENABLE"'),
    po_number: z.string().optional().describe('Purchase order number.'),
    postback_window_mode: z.string().optional().describe('Postback window mode.'),
    sales_destination: z.string().optional().describe('Sales destination.'),
    special_industries: z.array(z.string()).optional().describe('Special industries.')
});

const ProviderResponseDataSchema = z.object({
    campaign_id: z.string()
});

const OutputSchema = z.object({
    campaign_id: z.string()
});

const action = createAction({
    description: 'Create a Smart+ (Performance+) campaign in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-smart-plus-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739953431176226
            endpoint: 'smart_plus/campaign/create/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_name: input.campaign_name,
                objective_type: input.objective_type,
                request_id: input.request_id,
                ...(input.app_id !== undefined && { app_id: input.app_id }),
                ...(input.app_promotion_type !== undefined && { app_promotion_type: input.app_promotion_type }),
                ...(input.bid_align_type !== undefined && { bid_align_type: input.bid_align_type }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.budget_mode !== undefined && { budget_mode: input.budget_mode }),
                ...(input.budget_optimize_on !== undefined && { budget_optimize_on: input.budget_optimize_on }),
                ...(input.campaign_app_profile_page_state !== undefined && { campaign_app_profile_page_state: input.campaign_app_profile_page_state }),
                ...(input.campaign_type !== undefined && { campaign_type: input.campaign_type }),
                ...(input.catalog_enabled !== undefined && { catalog_enabled: input.catalog_enabled }),
                ...(input.catalog_type !== undefined && { catalog_type: input.catalog_type }),
                ...(input.disable_skan_campaign !== undefined && { disable_skan_campaign: input.disable_skan_campaign }),
                ...(input.is_advanced_dedicated_campaign !== undefined && { is_advanced_dedicated_campaign: input.is_advanced_dedicated_campaign }),
                ...(input.is_promotional_campaign !== undefined && { is_promotional_campaign: input.is_promotional_campaign }),
                ...(input.open_api_partner !== undefined && { open_api_partner: input.open_api_partner }),
                ...(input.operation_status !== undefined && { operation_status: input.operation_status }),
                ...(input.po_number !== undefined && { po_number: input.po_number }),
                ...(input.postback_window_mode !== undefined && { postback_window_mode: input.postback_window_mode }),
                ...(input.sales_destination !== undefined && { sales_destination: input.sales_destination }),
                ...(input.special_industries !== undefined && { special_industries: input.special_industries })
            },
            retries: 10
        };

        const response = await nango.post(config);

        const providerResponse = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                request_id: z.string().optional(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'tiktok_api_error',
                message: providerResponse.message || 'TikTok API returned an error',
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const data = ProviderResponseDataSchema.parse(providerResponse.data);

        return {
            campaign_id: data.campaign_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
