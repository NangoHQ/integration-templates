import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Number of results per page.'),
    include_sizing: z.boolean().optional().describe('Include audience sizing in result.'),
    search_query: z.string().optional().describe('Search query. Can contain pin description keywords or comma-separated pin IDs.')
});

const ProviderCustomerSegmentSchema = z.object({
    ad_account_id: z.string().optional(),
    audience_ids: z.array(z.string()),
    created_time: z.number().optional(),
    id: z.string().optional(),
    name: z.string(),
    status: z.string().optional(),
    updated_time: z.number().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderCustomerSegmentSchema),
    bookmark: z.string().nullable().optional()
});

const CustomerSegmentSchema = z.object({
    id: z.string().optional(),
    ad_account_id: z.string().optional(),
    name: z.string(),
    audience_ids: z.array(z.string()),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(CustomerSegmentSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List customer segments (combinations of audiences).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/customer_segment/list
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_segments`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.include_sizing !== undefined && { include_sizing: String(input.include_sizing) }),
                ...(input.search_query !== undefined && { search_query: input.search_query })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((segment) => ({
                ...(segment.id !== undefined && { id: segment.id }),
                ...(segment.ad_account_id !== undefined && { ad_account_id: segment.ad_account_id }),
                name: segment.name,
                audience_ids: segment.audience_ids,
                ...(segment.status !== undefined && { status: segment.status }),
                ...(segment.created_time !== undefined && { created_time: segment.created_time }),
                ...(segment.updated_time !== undefined && { updated_time: segment.updated_time })
            })),
            ...(providerResponse.bookmark != null && { bookmark: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
