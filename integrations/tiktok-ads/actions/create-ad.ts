import { z } from 'zod';
import { createAction } from 'nango';

const CreativeSchema = z.object({
    ad_name: z.string().describe('Name of the ad. Example: "Summer Sale Ad"'),
    ad_format: z.string().optional().describe('Ad format. Example: "SINGLE_IMAGE", "CAROUSEL", "SINGLE_VIDEO"'),
    ad_text: z.string().optional().describe('Primary text for the ad. Example: "Shop our summer collection!"'),
    ad_texts: z.array(z.string()).optional().describe('Multiple ad texts for dynamic creative.'),
    call_to_action: z.string().optional().describe('Call to action button text. Example: "SHOP_NOW"'),
    landing_page_url: z.string().optional().describe('Landing page URL for the ad. Example: "https://example.com/sale"'),
    video_id: z.string().optional().describe('Video ID from the TikTok asset library.'),
    image_ids: z.array(z.string()).optional().describe('Image IDs from the TikTok asset library.'),
    identity_id: z.string().optional().describe('Identity ID for the ad. Required for certain placements.'),
    identity_type: z.string().optional().describe('Identity type. Example: "CUSTOMIZED_USER", "AUTH_CODE", "TT_USER"'),
    creative_authorized: z.boolean().optional().describe('Whether the creative is authorized.'),
    operation_status: z.string().optional().describe('Operation status of the ad. Example: "ENABLE" or "DISABLE"'),
    click_tracking_url: z.string().optional().describe('Click tracking URL.'),
    impression_tracking_url: z.string().optional().describe('Impression tracking URL.'),
    aigc_disclosure_type: z.string().optional().describe('AIGC disclosure type. Example: "NOT_DECLARED"'),
    deeplink: z.string().optional().describe('Deeplink URL for app promotion.'),
    deeplink_type: z.string().optional().describe('Deeplink type. Example: "NORMAL"'),
    music_id: z.string().optional().describe('Background music ID.'),
    page_id: z.number().optional().describe('Page ID for instant form or landing page.'),
    phone_number: z.string().optional().describe('Phone number for call ads.'),
    phone_region_calling_code: z.string().optional().describe('Phone region calling code.'),
    phone_region_code: z.string().optional().describe('Phone region code.'),
    catalog_id: z.string().optional().describe('Catalog ID for catalog ads.'),
    product_set_id: z.string().optional().describe('Product set ID for catalog ads.'),
    sku_ids: z.array(z.string()).optional().describe('SKU IDs for catalog ads.'),
    item_group_ids: z.array(z.string()).optional().describe('Item group IDs for collection ads.'),
    tiktok_item_id: z.string().optional().describe('TikTok Shop item ID.'),
    card_id: z.string().optional().describe('Card ID for playable ads.'),
    playable_url: z.string().optional().describe('Playable ad URL.'),
    promotional_music_disabled: z.boolean().optional().describe('Whether promotional music is disabled.'),
    auto_disclaimer_types: z.array(z.string()).optional().describe('Auto disclaimer types.'),
    creative_type: z.string().optional().describe('Creative type.'),
    dark_post_status: z.string().optional().describe('Dark post status.'),
    utm_params: z
        .array(
            z.object({
                utm_campaign: z.string().optional(),
                utm_content: z.string().optional(),
                utm_medium: z.string().optional(),
                utm_source: z.string().optional(),
                utm_term: z.string().optional()
            })
        )
        .optional()
        .describe('UTM parameters.')
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    adgroup_id: z.string().describe('Ad group ID to create the ad under. Example: "1866248800809074"'),
    creatives: z.array(CreativeSchema).min(1).describe('Array of creative objects for the ad.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            ad_ids: z.array(z.string()).optional(),
            success_count: z.number().optional(),
            fail_count: z.number().optional(),
            errors: z.array(z.unknown()).optional()
        })
        .optional(),
    request_id: z.string().optional()
});

const OutputSchema = z.object({
    ad_ids: z.array(z.string()).describe('IDs of the created ads.'),
    success_count: z.number().optional().describe('Number of successfully created ads.'),
    fail_count: z.number().optional().describe('Number of failed ad creations.')
});

const action = createAction({
    description: 'Create a ad in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-ad',
        group: 'Ads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read', 'ads.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739953377508354
            endpoint: 'ad/create/',
            data: {
                advertiser_id: input.advertiser_id,
                adgroup_id: input.adgroup_id,
                creatives: input.creatives
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

        const data = providerResponse.data;
        if (!data) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'Provider response did not contain data.'
            });
        }

        return {
            ad_ids: data.ad_ids ?? [],
            ...(data.success_count !== undefined && { success_count: data.success_count }),
            ...(data.fail_count !== undefined && { fail_count: data.fail_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
