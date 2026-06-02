import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().optional().describe('Campaign ID to filter by. Example: "1866249031553154"'),
    page: z.number().optional().describe('Page number. Defaults to 1.'),
    page_size: z.number().optional().describe('Page size. Defaults to 10.')
});

const PageInfoSchema = z.object({
    total_number: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_page: z.number()
});

const CampaignSchema = z
    .object({
        campaign_id: z.string(),
        campaign_name: z.string(),
        advertiser_id: z.string(),
        campaign_type: z.string().optional(),
        budget: z.number().optional(),
        budget_mode: z.string().optional(),
        objective_type: z.string().optional(),
        secondary_status: z.string().optional(),
        operation_status: z.string().optional(),
        create_time: z.string().optional(),
        modify_time: z.string().optional(),
        is_smart_performance_campaign: z.boolean().optional(),
        budget_optimize_on: z.boolean().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.unknown()),
            page_info: PageInfoSchema
        })
        .optional()
});

const OutputSchema = z.object({
    campaigns: z.array(CampaignSchema),
    page_info: PageInfoSchema
});

const action = createAction({
    description: 'Retrieve Smart+ campaign details from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-smart-plus-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filtering: Record<string, unknown> = {};
        if (input.campaign_id) {
            filtering['campaign_ids'] = [input.campaign_id];
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1822000938005506
            endpoint: 'smart_plus/campaign/get/',
            params: {
                advertiser_id: input.advertiser_id,
                ...(Object.keys(filtering).length > 0 && { filtering: JSON.stringify(filtering) }),
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || `TikTok API returned error code ${providerResponse.code}`,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No campaign data returned from TikTok API.'
            });
        }

        const campaigns = providerResponse.data.list.map((item) => {
            return CampaignSchema.parse(item);
        });

        return {
            campaigns,
            page_info: providerResponse.data.page_info
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
