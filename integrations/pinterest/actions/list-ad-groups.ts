import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    campaign_ids: z.array(z.string()).optional().describe('Filter by campaign IDs.'),
    ad_group_ids: z.array(z.string()).optional().describe('Filter by ad group IDs.'),
    entity_statuses: z.array(z.string()).optional().describe('Filter by entity statuses.')
});

const AdGroupSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string(),
        campaign_id: z.string(),
        name: z.string(),
        status: z.string(),
        summary_status: z.string(),
        billable_event: z.string(),
        created_time: z.number(),
        updated_time: z.number(),
        type: z.string(),
        bid_in_micro_currency: z.number().nullable().optional(),
        budget_in_micro_currency: z.number().nullable().optional(),
        bid_strategy_type: z.string().optional(),
        start_time: z.number().nullable().optional(),
        end_time: z.number().nullable().optional(),
        targeting_spec: z.record(z.string(), z.unknown()).nullable().optional(),
        placement_group: z.string().optional(),
        tracking_urls: z.record(z.string(), z.unknown()).nullable().optional(),
        auto_targeting_enabled: z.boolean().nullable().optional(),
        is_creative_optimization: z.boolean().nullable().optional(),
        conversion_learning_mode_type: z.string().nullable().optional(),
        customer_segment_id: z.string().optional(),
        targeting_template_ids: z.array(z.string()).nullable().optional(),
        promotion_id: z.string().nullable().optional(),
        promotion_ids: z.array(z.string()).optional(),
        feed_profile_id: z.string().optional(),
        lifetime_frequency_cap: z.number().optional(),
        local_inventory_radius_in_miles: z.number().optional(),
        optimization_goal_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        performance_plus_campaign_settings: z.record(z.string(), z.unknown()).nullable().optional(),
        placement_traffic_type: z.string().nullable().optional(),
        promotion_application_level: z.string().nullable().optional(),
        budget_type: z.string().optional(),
        pacing_delivery_type: z.string().optional(),
        bid_multiplier: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AdGroupSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List ad groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/list
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.campaign_ids !== undefined && input.campaign_ids.length > 0 && { campaign_ids: input.campaign_ids }),
                ...(input.ad_group_ids !== undefined && input.ad_group_ids.length > 0 && { ad_group_ids: input.ad_group_ids }),
                ...(input.entity_statuses !== undefined && input.entity_statuses.length > 0 && { entity_statuses: input.entity_statuses })
            },
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(z.unknown()),
                bookmark: z.string().nullable().optional()
            })
            .parse(response.data);

        const items = parsed.items.map((item: unknown) => AdGroupSchema.parse(item));

        return {
            items,
            ...(parsed.bookmark != null && { bookmark: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
