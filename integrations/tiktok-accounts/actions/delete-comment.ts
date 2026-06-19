import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644117588953235464"'),
    ad_id: z.string().describe('Ad ID. Example: "123456789"'),
    tiktok_item_id: z.string().describe('TikTok video/item ID. Example: "123456789"'),
    comment_id: z.string().describe('Comment ID to delete. Example: "123456789"'),
    identity_type: z.string().describe('Identity type. Enum: AUTH_CODE, TT_USER, CUSTOMIZED_USER, BC_AUTH_TT. Example: "TT_USER"'),
    identity_id: z.string().describe('Identity ID. Example: "123456789"')
});

const ProviderResponseSchema = z.object({
    code: z.number().nullable().optional(),
    data: z.unknown().nullable().optional(),
    message: z.string().nullable().optional(),
    request_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    code: z.number().optional(),
    request_id: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a comment from a TikTok video',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1738957772267522
            endpoint: '/comment/delete/',
            data: {
                advertiser_id: input.advertiser_id,
                ad_id: input.ad_id,
                tiktok_item_id: input.tiktok_item_id,
                comment_id: input.comment_id,
                identity_type: input.identity_type,
                identity_id: input.identity_id
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const isSuccess = providerResponse.code === undefined || providerResponse.code === null || providerResponse.code === 0;

        return {
            success: isSuccess,
            ...(providerResponse.code !== undefined && providerResponse.code !== null && { code: providerResponse.code }),
            ...(providerResponse.request_id != null && { request_id: providerResponse.request_id }),
            ...(providerResponse.message != null && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
