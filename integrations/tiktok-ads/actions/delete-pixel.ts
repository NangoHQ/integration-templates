import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    pixel_id: z.string().describe('Pixel ID to archive. Example: "1234567890"')
});

const PixelListResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    data: z
        .object({
            pixels: z.array(
                z.object({
                    pixel_id: z.string(),
                    pixel_name: z.string()
                })
            )
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    pixel_id: z.string(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a pixel in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
        const listResponse = await nango.get({
            endpoint: 'pixel/list/',
            params: {
                advertiser_id: input.advertiser_id,
                pixel_id: input.pixel_id
            },
            retries: 3
        });

        const listData = PixelListResponseSchema.parse(listResponse.data);

        if (listData.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: listData.message || 'Failed to fetch pixel details',
                code: listData.code
            });
        }

        const pixels = listData.data?.pixels ?? [];
        const pixel = pixels.find((p) => p.pixel_id === input.pixel_id);

        if (!pixel) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Pixel with ID ${input.pixel_id} not found`,
                pixel_id: input.pixel_id
            });
        }

        // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
        const updateResponse = await nango.post({
            endpoint: 'pixel/update/',
            data: {
                advertiser_id: input.advertiser_id,
                pixel_id: input.pixel_id,
                pixel_name: `${pixel.pixel_name} Archived`,
                opt_status: 'DISABLE'
            },
            retries: 3
        });

        const updateData = ProviderResponseSchema.parse(updateResponse.data);

        if (updateData.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: updateData.message || 'Failed to archive pixel',
                code: updateData.code
            });
        }

        return {
            success: true,
            pixel_id: input.pixel_id,
            message: updateData.message || 'Pixel archived successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
