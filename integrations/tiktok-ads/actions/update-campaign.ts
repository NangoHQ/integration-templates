import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('TikTok campaign ID. Example: "1234567890"'),
    budget: z.number().optional().describe('Campaign budget. Example: 1000'),
    campaign_name: z.string().optional().describe('Campaign name. Example: "Summer Sale Campaign"'),
    po_number: z.string().optional().describe('Purchase order number. Example: "PO-12345"'),
    special_industries: z.array(z.string()).optional().describe('Special industries. Example: ["GAMING"]')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            campaign_id: z.string().optional()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    campaign_id: z.string().optional()
});

const action = createAction({
    description: 'Update a campaign in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            advertiser_id: input['advertiser_id'],
            campaign_id: input['campaign_id']
        };

        if (input['budget'] !== undefined) {
            payload['budget'] = input['budget'];
        }

        if (input['campaign_name'] !== undefined) {
            payload['campaign_name'] = input['campaign_name'];
        }

        if (input['po_number'] !== undefined) {
            payload['po_number'] = input['po_number'];
        }

        if (input['special_industries'] !== undefined) {
            payload['special_industries'] = input['special_industries'];
        }

        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739320422086657
            endpoint: 'campaign/update/',
            data: payload,
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from TikTok API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message,
            ...(providerResponse.request_id != null && { request_id: providerResponse.request_id }),
            ...(providerResponse.data?.campaign_id != null && { campaign_id: providerResponse.data.campaign_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
