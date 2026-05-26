import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    pixel_name: z.string().describe('Pixel name. Example: "My Pixel"'),
    partner_name: z.string().optional().describe('Partner name. Example: "Shopify"'),
    pixel_category: z.string().optional().describe('Pixel category. Example: "ECOMMERCE"')
});

const ProviderPixelSchema = z
    .object({
        pixel_id: z.string(),
        pixel_code: z.string().nullable().optional(),
        pixel_name: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        pixel_category: z.string().nullable().optional(),
        partner_name: z.string().nullable().optional(),
        advertiser_id: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown()
});

const OutputSchema = z.object({
    pixel_id: z.string(),
    pixel_code: z.string().optional(),
    pixel_name: z.string().optional(),
    status: z.string().optional(),
    pixel_category: z.string().optional(),
    partner_name: z.string().optional(),
    advertiser_id: z.string().optional()
});

const action = createAction({
    description: 'Create a pixel in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-pixel',
        group: 'Pixels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['advertiser_pixels_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1740858779758593
            endpoint: 'pixel/create/',
            data: {
                advertiser_id: input.advertiser_id,
                pixel_name: input.pixel_name,
                ...(input.partner_name !== undefined && { partner_name: input.partner_name }),
                ...(input.pixel_category !== undefined && { pixel_category: input.pixel_category })
            },
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || `Provider returned code ${providerResponse.code}`,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const providerPixel = ProviderPixelSchema.parse(providerResponse.data);

        return {
            pixel_id: providerPixel.pixel_id,
            ...(providerPixel.pixel_code != null && { pixel_code: providerPixel.pixel_code }),
            ...(providerPixel.pixel_name != null && { pixel_name: providerPixel.pixel_name }),
            ...(providerPixel.status != null && { status: providerPixel.status }),
            ...(providerPixel.pixel_category != null && { pixel_category: providerPixel.pixel_category }),
            ...(providerPixel.partner_name != null && { partner_name: providerPixel.partner_name }),
            ...(providerPixel.advertiser_id != null && { advertiser_id: providerPixel.advertiser_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
