import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    custom_audience_id: z.string().describe('Custom audience ID to delete. Example: "1234567890"')
});

const TikTokResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    custom_audience_id: z.string(),
    request_id: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a custom audience in TikTok Ads',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['audiences'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739940539757569
            endpoint: '/dmp/custom_audience/delete/',
            data: {
                advertiser_id: input.advertiser_id,
                custom_audience_ids: [input.custom_audience_id]
            },
            retries: 10
        });

        const parsed = TikTokResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from TikTok API'
            });
        }

        const tiktokResponse = parsed.data;
        const success = tiktokResponse.code === 0;

        if (!success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: tiktokResponse.message || 'Failed to delete custom audience',
                code: tiktokResponse.code,
                request_id: tiktokResponse.request_id
            });
        }

        return {
            success: true,
            custom_audience_id: input.custom_audience_id,
            ...(tiktokResponse.request_id != null && { request_id: tiktokResponse.request_id }),
            ...(tiktokResponse.message != null && { message: tiktokResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
