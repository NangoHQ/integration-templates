import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('The advertiser ID. Example: "7644143197428744199"'),
    ad_id: z.string().describe('The ad ID to delete. Example: "1234567890123456"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    ad_id: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an ad in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-ad',
        group: 'Ads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739953422970882
            endpoint: 'ad/status/update/',
            data: {
                advertiser_id: input.advertiser_id,
                ad_ids: [input.ad_id],
                operation_status: 'DELETE'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || `Failed to delete ad (code: ${providerResponse.code})`,
                code: providerResponse.code,
                ad_id: input.ad_id
            });
        }

        return {
            success: true,
            ad_id: input.ad_id,
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
