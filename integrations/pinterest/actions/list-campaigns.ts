import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    bookmark: z.string().optional().describe('Pagination bookmark from the previous response. Omit for the first page.'),
    campaign_ids: z.array(z.string()).optional().describe('Filter by campaign IDs.'),
    entity_statuses: z.array(z.string()).optional().describe('Filter by entity statuses.')
});

const CampaignSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        objective_type: z.string().nullable().optional(),
        daily_spend_cap: z.number().nullable().optional(),
        lifetime_spend_cap: z.number().nullable().optional(),
        start_time: z.number().nullable().optional(),
        end_time: z.number().nullable().optional(),
        created_time: z.number().nullable().optional(),
        updated_time: z.number().nullable().optional(),
        is_flexible_daily_budgets: z.boolean().nullable().optional(),
        is_campaign_budget_optimization: z.boolean().nullable().optional(),
        summary_status: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    campaigns: z.array(CampaignSchema),
    bookmark: z.string().optional()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()).default([]),
    bookmark: z.string().nullable().optional()
});

const action = createAction({
    description: 'List campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/campaigns/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/campaigns`,
            params: {
                ...(input.bookmark !== undefined && { bookmark: input.bookmark }),
                ...(input.campaign_ids !== undefined && { campaign_ids: input.campaign_ids.join(',') }),
                ...(input.entity_statuses !== undefined && { entity_statuses: input.entity_statuses.join(',') })
            },
            retries: 3
        });

        const data = ListResponseSchema.parse(response.data);

        return {
            campaigns: data.items.map((item) => CampaignSchema.parse(item)),
            ...(data.bookmark != null && { bookmark: data.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
