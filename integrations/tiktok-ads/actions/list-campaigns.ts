import { z } from 'zod';
import { createAction } from 'nango';

const FilteringSchema = z.object({
    buying_types: z.array(z.string()).optional(),
    campaign_ids: z.array(z.string()).optional(),
    campaign_name: z.string().optional(),
    campaign_product_source: z.string().optional(),
    campaign_system_origins: z.array(z.string()).optional(),
    campaign_type: z.string().optional(),
    creation_filter_end_time: z.string().optional(),
    creation_filter_start_time: z.string().optional(),
    creative_campaign_type: z.array(z.string()).optional(),
    is_smart_performance_campaign: z.boolean().optional(),
    objective_type: z.string().optional(),
    optimization_goal: z.string().optional(),
    primary_status: z.string().optional(),
    sales_destination: z.string().optional(),
    secondary_status: z.string().optional(),
    split_test_enabled: z.boolean().optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of items per page. Default: 10. Max: 1000.'),
    filtering: FilteringSchema.optional().describe('Filtering criteria for campaigns.')
});

const PageInfoSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total_number: z.number().optional(),
    total_page: z.number().optional()
});

const CampaignSchema = z
    .object({
        campaign_id: z.string(),
        campaign_name: z.string().optional(),
        advertiser_id: z.string().optional(),
        campaign_type: z.string().optional(),
        objective_type: z.string().optional(),
        budget: z.number().optional(),
        budget_mode: z.string().optional(),
        secondary_status: z.string().optional(),
        operation_status: z.string().optional(),
        optimization_goal: z.string().optional(),
        create_time: z.string().optional(),
        modify_time: z.string().optional(),
        is_smart_performance_campaign: z.boolean().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.unknown()).optional(),
            page_info: PageInfoSchema.optional()
        })
        .optional()
});

const OutputSchema = z.object({
    campaigns: z.array(CampaignSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List campaigns from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-campaigns',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const currentPage = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(currentPage) || currentPage < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string.'
            });
        }

        const params: Record<string, string | number> = {
            advertiser_id: input.advertiser_id,
            page: currentPage,
            page_size: input.page_size || 10
        };

        if (input.filtering) {
            params['filtering'] = JSON.stringify(input.filtering);
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1739315828649986
            endpoint: 'campaign/get/',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'TikTok API returned an error.',
                code: providerResponse.code
            });
        }

        const campaignList = providerResponse.data?.list || [];
        const pageInfo = providerResponse.data?.page_info;

        const campaigns = campaignList.map((item) => {
            const parsed = CampaignSchema.parse(item);
            return parsed;
        });

        let nextCursor: string | undefined;
        if (pageInfo && pageInfo.page !== undefined && pageInfo.total_page !== undefined && pageInfo.page < pageInfo.total_page) {
            nextCursor = String(pageInfo.page + 1);
        }

        return {
            campaigns,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
