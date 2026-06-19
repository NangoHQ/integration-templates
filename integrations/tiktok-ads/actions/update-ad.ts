import { z } from 'zod';
import { createAction } from 'nango';

const CreativeSchema = z
    .object({
        ad_id: z.string().describe('The ID of the ad to update.'),
        ad_name: z.string().optional().describe('The new name for the ad.'),
        ad_text: z.string().optional().describe('The new primary text for the ad.'),
        ad_texts: z.array(z.string()).optional().describe('Multiple ad texts for dynamic creative.'),
        call_to_action: z.string().optional().describe('Call to action text.'),
        call_to_action_id: z.string().optional().describe('Call to action ID.'),
        video_id: z.string().optional().describe('Video asset ID.'),
        image_ids: z.array(z.string()).optional().describe('Image asset IDs.'),
        landing_page_url: z.string().optional().describe('Landing page URL.'),
        deeplink: z.string().optional().describe('Deeplink URL.'),
        deeplink_type: z.string().optional().describe('Deeplink type.'),
        tracking_pixel_id: z.string().optional().describe('Tracking pixel ID.'),
        music_id: z.string().optional().describe('Music ID.'),
        page_id: z.string().optional().describe('Page ID.'),
        creative_authorized: z.boolean().optional().describe('Whether the creative is authorized.'),
        instant_product_page_used: z.boolean().optional().describe('Whether instant product page is used.'),
        promotional_music_disabled: z.boolean().optional().describe('Whether promotional music is disabled.'),
        click_tracking_url: z.string().optional().describe('Click tracking URL.'),
        impression_tracking_url: z.string().optional().describe('Impression tracking URL.'),
        video_view_tracking_url: z.string().optional().describe('Video view tracking URL.'),
        aigc_disclosure_type: z.string().optional().describe('AIGC disclosure type.'),
        identity_id: z.string().optional().describe('Identity ID.'),
        identity_type: z.string().optional().describe('Identity type.'),
        avatar_icon_web_uri: z.string().optional().describe('Avatar icon web URI.'),
        display_name: z.string().optional().describe('Display name.'),
        app_name: z.string().optional().describe('App name.'),
        product_set_id: z.string().optional().describe('Product set ID.'),
        product_specific_type: z.string().optional().describe('Product specific type.'),
        sku_ids: z.array(z.string()).optional().describe('SKU IDs.'),
        tiktok_item_id: z.string().optional().describe('TikTok item ID.'),
        item_group_ids: z.array(z.string()).optional().describe('Item group IDs.'),
        shopping_ads_deeplink_type: z.string().optional().describe('Shopping ads deeplink type.'),
        shopping_ads_fallback_type: z.string().optional().describe('Shopping ads fallback type.'),
        shopping_ads_video_package_id: z.string().optional().describe('Shopping ads video package ID.'),
        dynamic_destination: z.string().optional().describe('Dynamic destination.'),
        dynamic_format: z.string().optional().describe('Dynamic format.'),
        carousel_image_index: z.number().optional().describe('Carousel image index.'),
        page_image_index: z.number().optional().describe('Page image index.'),
        dark_post_status: z.string().optional().describe('Dark post status.'),
        item_duet_status: z.string().optional().describe('Item duet status.'),
        item_stitch_status: z.string().optional().describe('Item stitch status.'),
        vertical_video_strategy: z.string().optional().describe('Vertical video strategy.'),
        creative_type: z.string().optional().describe('Creative type.'),
        operation_status: z.string().optional().describe('Operation status.'),
        card_id: z.string().optional().describe('Card ID.'),
        playable_url: z.string().optional().describe('Playable URL.'),
        cpp_url: z.string().optional().describe('CPP URL.'),
        vast_moat_enabled: z.boolean().optional().describe('Whether VAST Moat is enabled.'),
        brand_safety_postbid_partner: z.string().optional().describe('Brand safety postbid partner.'),
        brand_safety_vast_url: z.string().optional().describe('Brand safety VAST URL.'),
        viewability_postbid_partner: z.string().optional().describe('Viewability postbid partner.'),
        viewability_vast_url: z.string().optional().describe('Viewability VAST URL.'),
        fallback_type: z.string().optional().describe('Fallback type.')
    })
    .passthrough();

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    adgroup_id: z.string().describe('Ad group ID. Example: "1866248998099217"'),
    creatives: z.array(CreativeSchema).min(1).describe('Array of creative objects to update. Each object must include ad_id.'),
    patch_update: z.boolean().optional().describe('If true, performs a partial update of the provided fields only.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z
        .object({
            ad_ids: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z
        .object({
            ad_ids: z.array(z.string()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an ad in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const requestBody: Record<string, unknown> = {
            advertiser_id: input.advertiser_id,
            adgroup_id: input.adgroup_id,
            creatives: input.creatives
        };

        if (input['patch_update'] !== undefined) {
            requestBody['patch_update'] = input['patch_update'];
        }

        // https://business-api.tiktok.com/portal/docs?id=1739953405142018
        const response = await nango.post({
            endpoint: 'ad/update/',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'tiktok_api_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message,
            request_id: providerResponse.request_id,
            ...(providerResponse.data !== undefined && { data: providerResponse.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
