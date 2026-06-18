import { z } from 'zod';
import { createAction } from 'nango';

const ImageInfoSchema = z.object({
    web_uri: z.string().describe('Image ID')
});

const VideoInfoSchema = z.object({
    video_id: z.string().describe('Video ID'),
    file_name: z.string().optional()
});

const MusicInfoSchema = z.object({
    music_id: z.string().describe('Music ID')
});

const CreativeInfoSchema = z.object({
    ad_format: z.string().describe('Ad format. Example: SINGLE_VIDEO'),
    aigc_disclosure_type: z.string().optional(),
    identity_authorized_bc_id: z.string().optional(),
    identity_id: z.string().optional(),
    identity_type: z.string().optional(),
    image_info: z.array(ImageInfoSchema).optional(),
    music_info: MusicInfoSchema.optional(),
    tiktok_item_id: z.string().optional(),
    video_info: VideoInfoSchema.optional()
});

const CreativeListItemSchema = z.object({
    creative_info: CreativeInfoSchema
});

const AdTextListItemSchema = z.object({
    ad_text: z.string()
});

const AutoMessageListItemSchema = z.object({
    auto_message_id: z.string()
});

const CallToActionListItemSchema = z.object({
    call_to_action: z.string()
});

const InteractiveAddOnListItemSchema = z.object({
    card_id: z.string()
});

const PageListItemSchema = z.object({
    page_id: z.string()
});

const LandingPageUrlListItemSchema = z.object({
    landing_page_url: z.string().optional()
});

const DeeplinkListItemSchema = z.object({
    deeplink: z.string().optional(),
    deeplink_type: z.string().optional()
});

const PhoneInfoSchema = z.object({
    phone_number: z.string().optional(),
    phone_region_calling_code: z.string().optional(),
    phone_region_code: z.string().optional()
});

const TrackingInfoSchema = z.object({
    impression_tracking_url: z.string().optional(),
    click_tracking_url: z.string().optional(),
    tracking_app_id: z.string().optional(),
    tracking_message_event_set_id: z.string().optional()
});

const UtmParamSchema = z.object({
    key: z.string().optional(),
    value: z.string().optional()
});

const AdConfigurationSchema = z.object({
    identity_type: z.string().optional(),
    identity_id: z.string().optional(),
    dark_post_status: z.string().optional(),
    product_specific_type: z.string().optional(),
    product_set_id: z.string().optional(),
    product_ids: z.array(z.string()).optional(),
    catalog_creative_toggle: z.boolean().optional(),
    call_to_action_id: z.string().optional(),
    end_card_cta: z.string().optional(),
    product_display_field_list: z.array(z.string()).optional(),
    auto_disclaimer_types: z.array(z.string()).optional(),
    fallback_type: z.string().optional(),
    phone_info: PhoneInfoSchema.optional(),
    tracking_info: TrackingInfoSchema.optional(),
    utm_params: z.array(UtmParamSchema).optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: 7644143197428744199'),
    adgroup_id: z.string().describe('Ad group ID. Example: 1866248998099217'),
    ad_name: z.string().describe('Ad name'),
    operation_status: z.string().optional().describe('Operation status. Default: ENABLE'),
    creative_list: z.array(CreativeListItemSchema).optional(),
    ad_text_list: z.array(AdTextListItemSchema).optional(),
    auto_message_list: z.array(AutoMessageListItemSchema).optional(),
    call_to_action_list: z.array(CallToActionListItemSchema).optional(),
    interactive_add_on_list: z.array(InteractiveAddOnListItemSchema).optional(),
    page_list: z.array(PageListItemSchema).optional(),
    landing_page_url_list: z.array(LandingPageUrlListItemSchema).optional(),
    deeplink_list: z.array(DeeplinkListItemSchema).optional(),
    ad_configuration: AdConfigurationSchema.optional()
});

const ProviderAdSchema = z.object({
    smart_plus_ad_id: z.string().optional(),
    advertiser_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    adgroup_id: z.string().optional(),
    adgroup_name: z.string().optional(),
    ad_name: z.string().optional(),
    operation_status: z.string().optional(),
    secondary_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const OutputSchema = z.object({
    smart_plus_ad_id: z.string().describe('The ID of the created Smart+ ad'),
    advertiser_id: z.string().optional(),
    campaign_id: z.string().optional(),
    adgroup_id: z.string().optional(),
    ad_name: z.string().optional(),
    operation_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const action = createAction({
    description: 'Create a Smart+ ad in TikTok Ads',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            advertiser_id: input.advertiser_id,
            adgroup_id: input.adgroup_id,
            ad_name: input.ad_name,
            ...(input.operation_status !== undefined && { operation_status: input.operation_status }),
            ...(input.creative_list !== undefined && { creative_list: input.creative_list }),
            ...(input.ad_text_list !== undefined && { ad_text_list: input.ad_text_list }),
            ...(input.auto_message_list !== undefined && { auto_message_list: input.auto_message_list }),
            ...(input.call_to_action_list !== undefined && { call_to_action_list: input.call_to_action_list }),
            ...(input.interactive_add_on_list !== undefined && { interactive_add_on_list: input.interactive_add_on_list }),
            ...(input.page_list !== undefined && { page_list: input.page_list }),
            ...(input.landing_page_url_list !== undefined && { landing_page_url_list: input.landing_page_url_list }),
            ...(input.deeplink_list !== undefined && { deeplink_list: input.deeplink_list }),
            ...(input.ad_configuration !== undefined && { ad_configuration: input.ad_configuration })
        };

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1751559544808450
            endpoint: 'smart_plus/ad/create/',
            data: requestBody,
            retries: 3
        });

        const apiResponse = z
            .object({
                code: z.number().optional(),
                message: z.string().optional(),
                request_id: z.string().optional(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (apiResponse.code !== undefined && apiResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: apiResponse.message || `TikTok API error (code: ${apiResponse.code})`,
                request_id: apiResponse.request_id,
                code: apiResponse.code
            });
        }

        if (!apiResponse.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected empty response data from TikTok API'
            });
        }

        const adData = ProviderAdSchema.parse(apiResponse.data);

        if (!adData.smart_plus_ad_id) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing smart_plus_ad_id in TikTok API response'
            });
        }

        return {
            smart_plus_ad_id: adData.smart_plus_ad_id,
            ...(adData.advertiser_id !== undefined && { advertiser_id: adData.advertiser_id }),
            ...(adData.campaign_id !== undefined && { campaign_id: adData.campaign_id }),
            ...(adData.adgroup_id !== undefined && { adgroup_id: adData.adgroup_id }),
            ...(adData.ad_name !== undefined && { ad_name: adData.ad_name }),
            ...(adData.operation_status !== undefined && { operation_status: adData.operation_status }),
            ...(adData.create_time !== undefined && { create_time: adData.create_time }),
            ...(adData.modify_time !== undefined && { modify_time: adData.modify_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
