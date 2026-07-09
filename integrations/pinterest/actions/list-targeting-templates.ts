import { z } from 'zod';
import { createAction } from 'nango';

const TargetingTemplateKeywordSchema = z.object({
    match_type: z.string().optional(),
    value: z.string().optional()
});

const TargetingTemplateAudienceSizingReachEstimateSchema = z.object({
    estimate: z.number().optional(),
    lower_bound: z.number().optional(),
    upper_bound: z.number().optional()
});

const TargetingTemplateAudienceSizingSchema = z
    .object({
        reach_estimate: TargetingTemplateAudienceSizingReachEstimateSchema.optional()
    })
    .nullable();

const TrackingUrlsSchema = z
    .object({
        audience_verification: z.array(z.string()).optional(),
        buyable_button: z.array(z.string()).optional(),
        click: z.array(z.string()).optional(),
        engagement: z.array(z.string()).optional(),
        impression: z.array(z.string()).optional()
    })
    .nullable();

const TargetingTemplateSchema = z
    .object({
        ad_account_id: z.string().optional(),
        auto_targeting_enabled: z.boolean().optional(),
        created_time: z.number().optional(),
        id: z.string().optional(),
        keywords: z.array(TargetingTemplateKeywordSchema).optional(),
        name: z.string().optional(),
        placement_group: z.string().optional(),
        sizing: TargetingTemplateAudienceSizingSchema.optional(),
        status: z.string().optional(),
        targeting_attributes: z.object({}).passthrough().optional(),
        tracking_urls: TrackingUrlsSchema.optional(),
        updated_time: z.number().optional(),
        valid: z.boolean().nullable().optional()
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Number of items per page.'),
    order: z.string().optional().describe('Ordering parameter.'),
    include_sizing: z.boolean().optional().describe('Include audience sizing estimates.'),
    search_query: z.string().optional().describe('Search query to filter templates.')
});

const ListOutputSchema = z.object({
    items: z.array(TargetingTemplateSchema),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(z.unknown())
});

const action = createAction({
    description: 'List reusable targeting templates.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/targeting_template/list
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/targeting_templates`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.include_sizing !== undefined && { include_sizing: String(input.include_sizing) }),
                ...(input.search_query !== undefined && { search_query: input.search_query })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => {
            return TargetingTemplateSchema.parse(item);
        });

        return {
            items,
            ...(providerResponse.bookmark != null && { next_cursor: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
