import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('GMV Max campaign ID. Example: "1866249031553154"')
});

const OutputSchema = z.object({
    campaign: z.record(z.string(), z.unknown()).optional()
});

const TikTokApiResponseSchema = z.object({
    code: z.number(),
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    message: z.string().optional(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve GMV Max campaign details from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1822000968821762
            endpoint: 'campaign/gmv_max/info/',
            params: {
                advertiser_id: input.advertiser_id,
                campaign_id: input.campaign_id
            },
            retries: 3
        });

        const body = TikTokApiResponseSchema.parse(response.data);

        if (body.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message || `TikTok API returned code ${body.code}`,
                code: body.code,
                request_id: body.request_id
            });
        }

        if (!body.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'GMV Max campaign not found',
                campaign_id: input.campaign_id
            });
        }

        return {
            campaign: body.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
