import { z } from 'zod';
import { createAction } from 'nango';

const AdConfigurationSchema = z.object({
    auto_disclaimer_types: z.array(z.string()).optional(),
    call_to_action_id: z.string().optional(),
    catalog_creative_toggle: z.boolean().optional(),
    dark_post_status: z.string().optional(),
    end_card_cta: z.string().optional(),
    fallback_type: z.string().optional(),
    identity_id: z.string().optional(),
    identity_type: z.string().optional(),
    product_ids: z.array(z.string()).optional(),
    product_set_id: z.string().optional(),
    product_specific_type: z.string().optional(),
    tracking_info: z.record(z.string(), z.unknown()).optional(),
    utm_params: z.array(z.record(z.string(), z.unknown())).optional()
});

const CreativeInfoSchema = z.object({
    ad_format: z.string(),
    aigc_disclosure_type: z.string().optional(),
    identity_authorized_bc_id: z.string().optional(),
    identity_id: z.string().optional(),
    identity_type: z.string().optional(),
    image_info: z.array(z.record(z.string(), z.unknown())).optional(),
    music_info: z.record(z.string(), z.unknown()).optional(),
    tiktok_item_id: z.string().optional(),
    video_info: z.record(z.string(), z.unknown()).optional()
});

const CreativeListItemSchema = z.object({
    creative_info: CreativeInfoSchema
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    smart_plus_ad_id: z.string().describe('Smart+ ad ID to update. Example: "1866249031553154"'),
    ad_name: z.string().optional().describe('New name for the ad.'),
    ad_text_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of ad text objects.'),
    call_to_action_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of call-to-action objects.'),
    creative_list: z.array(CreativeListItemSchema).optional().describe('List of creative objects to update.'),
    deeplink_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of deeplink objects.'),
    interactive_add_on_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of interactive add-on objects.'),
    landing_page_url_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of landing page URL objects.'),
    page_list: z.array(z.record(z.string(), z.unknown())).optional().describe('List of page objects.'),
    ad_configuration: AdConfigurationSchema.optional().describe('Ad configuration settings.')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    smart_plus_ad_id: z.string(),
    message: z.string().optional(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Update a Smart+ ad in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1770562068226177
            endpoint: 'smart_plus/ad/update/',
            data: {
                advertiser_id: input.advertiser_id,
                smart_plus_ad_id: input.smart_plus_ad_id,
                ...(input.ad_name !== undefined && { ad_name: input.ad_name }),
                ...(input.ad_text_list !== undefined && { ad_text_list: input.ad_text_list }),
                ...(input.call_to_action_list !== undefined && { call_to_action_list: input.call_to_action_list }),
                ...(input.creative_list !== undefined && { creative_list: input.creative_list }),
                ...(input.deeplink_list !== undefined && { deeplink_list: input.deeplink_list }),
                ...(input.interactive_add_on_list !== undefined && { interactive_add_on_list: input.interactive_add_on_list }),
                ...(input.landing_page_url_list !== undefined && { landing_page_url_list: input.landing_page_url_list }),
                ...(input.page_list !== undefined && { page_list: input.page_list }),
                ...(input.ad_configuration !== undefined && { ad_configuration: input.ad_configuration })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'TikTok API returned an error',
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const data = providerResponse.data || {};
        const smartPlusAdId = data['smart_plus_ad_id'];
        if (typeof smartPlusAdId !== 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Response did not contain a valid smart_plus_ad_id',
                request_id: providerResponse.request_id
            });
        }

        return {
            smart_plus_ad_id: smartPlusAdId,
            ...(providerResponse.message !== undefined && { message: providerResponse.message }),
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
