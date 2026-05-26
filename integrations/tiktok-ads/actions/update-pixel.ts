import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    pixel_id: z.string().describe('Pixel ID. Example: "1234567890"'),
    pixel_name: z.string().describe('Pixel name. Maximum 128 characters.'),
    advanced_matching_fields: z
        .object({
            email: z.boolean().optional(),
            phone_number: z.boolean().optional()
        })
        .optional()
        .describe('Advanced matching fields configuration.')
});

const OutputSchema = z.object({
    pixel_id: z.string(),
    pixel_name: z.string()
});

const action = createAction({
    description: 'Update a pixel in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-pixel',
        group: 'Pixels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            advertiser_id: input.advertiser_id,
            pixel_id: input.pixel_id,
            pixel_name: input.pixel_name
        };

        if (input.advanced_matching_fields !== undefined) {
            body['advanced_matching_fields'] = input.advanced_matching_fields;
        }

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1740858799524865
            endpoint: 'pixel/update/',
            data: body,
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            retries: 3
        });

        const ResponseShape = z
            .object({
                code: z.number(),
                message: z.string(),
                data: z.unknown().optional()
            })
            .passthrough();

        const responseData = ResponseShape.parse(response.data);

        if (responseData.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: responseData.message,
                code: responseData.code
            });
        }

        return {
            pixel_id: input.pixel_id,
            pixel_name: input.pixel_name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
