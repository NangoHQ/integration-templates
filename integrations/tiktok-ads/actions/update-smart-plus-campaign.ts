import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('Smart+ campaign ID. Example: "1866249031553154"'),
    campaign_name: z.string().optional().describe('New campaign name'),
    budget: z.number().optional().describe('New campaign budget'),
    po_number: z.string().optional().describe('Purchase order number')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            campaign_id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    campaign_id: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Update a Smart+ campaign in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739320422086657
            endpoint: 'smart_plus/campaign/update/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_id: input.campaign_id,
                ...(input.campaign_name !== undefined && { campaign_name: input.campaign_name }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.po_number !== undefined && { po_number: input.po_number })
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from TikTok API',
                details: parsed.error.message
            });
        }

        const body = parsed.data;

        if (body.code !== undefined && body.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message || `TikTok API returned code ${body.code}`,
                code: body.code,
                request_id: body.request_id
            });
        }

        const campaignId = body.data?.campaign_id;
        if (!campaignId) {
            throw new nango.ActionError({
                type: 'missing_campaign_id',
                message: 'Response did not contain a campaign_id',
                request_id: body.request_id
            });
        }

        return {
            campaign_id: campaignId,
            ...(body.request_id != null && { request_id: body.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
