import { z } from 'zod';
import { createAction } from 'nango';

const EntityStatusEnum = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']);

const InputSchema = z.object({
    ad_account_id: z.string().describe('Unique identifier of an ad account. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Maximum number of items to include in a single page. Default: 25'),
    order: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('The order in which to sort the items returned by ID. Default: ASCENDING'),
    campaign_ids: z.array(z.string()).optional().describe('List of campaign IDs to filter the results.'),
    ad_group_ids: z.array(z.string()).optional().describe('List of ad group IDs to filter the results.'),
    ad_ids: z.array(z.string()).optional().describe('List of ad IDs to filter the results.'),
    entity_statuses: z.array(EntityStatusEnum).optional().describe('Entity statuses to filter the results. Default: [ACTIVE, PAUSED]')
});

const ProviderAdSchema = z
    .object({
        id: z.string(),
        ad_group_id: z.string(),
        pin_id: z.string(),
        creative_type: z.string(),
        ad_account_id: z.string(),
        campaign_id: z.string(),
        rejected_reasons: z.array(z.string()),
        rejection_labels: z.array(z.string()),
        review_status: z.string(),
        type: z.string(),
        summary_status: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderAdSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    bookmark: z.string().nullable().optional()
});

const action = createAction({
    description: 'List ads.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/ads/operation/ads/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ads`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.campaign_ids !== undefined && { campaign_ids: input.campaign_ids.join(',') }),
                ...(input.ad_group_ids !== undefined && { ad_group_ids: input.ad_group_ids.join(',') }),
                ...(input.ad_ids !== undefined && { ad_ids: input.ad_ids.join(',') }),
                ...(input.entity_statuses !== undefined && { entity_statuses: input.entity_statuses.join(',') })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.items.map((item) => {
            return ProviderAdSchema.parse(item);
        });

        return {
            items,
            ...(listResponse.bookmark != null && { next_cursor: listResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
