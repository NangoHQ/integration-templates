import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    pixel_id: z.string().describe('Pixel ID. Example: "1234567890123456789"')
});

const ProviderPixelSchema = z.object({
    pixel_id: z.string(),
    pixel_code: z.string().optional(),
    pixel_name: z.string().optional(),
    pixel_category: z.string().optional(),
    pixel_setup_mode: z.string().optional(),
    partner_name: z.string().nullable().optional(),
    activity_status: z.string().optional(),
    create_time: z.string().optional(),
    advanced_matching_fields: z.record(z.string(), z.unknown()).optional(),
    has_pcm_config: z.unknown().optional(),
    pixel_script: z.string().optional(),
    events: z.array(z.record(z.string(), z.unknown())).optional(),
    asset_ownership: z
        .object({
            ownership_status: z.boolean().optional(),
            asset_relation_status: z.string().nullable().optional(),
            owner_bc_id: z.string().nullable().optional(),
            updated_at: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    pixel_id: z.string(),
    pixel_code: z.string().optional(),
    pixel_name: z.string().optional(),
    pixel_category: z.string().optional(),
    pixel_setup_mode: z.string().optional(),
    partner_name: z.string().optional(),
    activity_status: z.string().optional(),
    create_time: z.string().optional(),
    advanced_matching_fields: z.record(z.string(), z.unknown()).optional(),
    has_pcm_config: z.unknown().optional(),
    pixel_script: z.string().optional(),
    events: z.array(z.record(z.string(), z.unknown())).optional(),
    asset_ownership: z
        .object({
            ownership_status: z.boolean().optional(),
            asset_relation_status: z.string().optional(),
            owner_bc_id: z.string().optional(),
            updated_at: z.number().optional()
        })
        .optional()
});

const TikTokResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z.unknown()
});

const action = createAction({
    description: 'Retrieve a single pixel from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-pixel',
        group: 'Pixels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['advertiser_pixels'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1740858697598978
            endpoint: 'pixel/list/',
            params: {
                advertiser_id: input.advertiser_id,
                pixel_id: input.pixel_id
            },
            retries: 3
        });

        const parsedResponse = TikTokResponseSchema.parse(response.data);

        if (parsedResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsedResponse.message,
                code: parsedResponse.code
            });
        }

        const unknownData = parsedResponse.data;
        if (!unknownData || typeof unknownData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pixel not found',
                pixel_id: input.pixel_id,
                advertiser_id: input.advertiser_id
            });
        }

        const dataRecord = z.record(z.string(), z.unknown()).parse(unknownData);
        const rawPixels = dataRecord['pixels'];
        const pixels = Array.isArray(rawPixels) ? rawPixels : undefined;

        if (!pixels || !pixels.length) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pixel not found',
                pixel_id: input.pixel_id,
                advertiser_id: input.advertiser_id
            });
        }

        const providerPixel = ProviderPixelSchema.parse(pixels[0]);

        return {
            pixel_id: providerPixel.pixel_id,
            ...(providerPixel.pixel_code !== undefined && { pixel_code: providerPixel.pixel_code }),
            ...(providerPixel.pixel_name !== undefined && { pixel_name: providerPixel.pixel_name }),
            ...(providerPixel.pixel_category !== undefined && { pixel_category: providerPixel.pixel_category }),
            ...(providerPixel.pixel_setup_mode !== undefined && { pixel_setup_mode: providerPixel.pixel_setup_mode }),
            ...(providerPixel.partner_name != null && { partner_name: providerPixel.partner_name }),
            ...(providerPixel.activity_status !== undefined && { activity_status: providerPixel.activity_status }),
            ...(providerPixel.create_time !== undefined && { create_time: providerPixel.create_time }),
            ...(providerPixel.advanced_matching_fields !== undefined && {
                advanced_matching_fields: providerPixel.advanced_matching_fields
            }),
            ...(providerPixel.has_pcm_config !== undefined && { has_pcm_config: providerPixel.has_pcm_config }),
            ...(providerPixel.pixel_script !== undefined && { pixel_script: providerPixel.pixel_script }),
            ...(providerPixel.events !== undefined && { events: providerPixel.events }),
            ...(providerPixel.asset_ownership !== undefined && {
                asset_ownership: {
                    ...(providerPixel.asset_ownership.ownership_status !== undefined && {
                        ownership_status: providerPixel.asset_ownership.ownership_status
                    }),
                    ...(providerPixel.asset_ownership.asset_relation_status != null && {
                        asset_relation_status: providerPixel.asset_ownership.asset_relation_status
                    }),
                    ...(providerPixel.asset_ownership.owner_bc_id != null && {
                        owner_bc_id: providerPixel.asset_ownership.owner_bc_id
                    }),
                    ...(providerPixel.asset_ownership.updated_at !== undefined && {
                        updated_at: providerPixel.asset_ownership.updated_at
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
