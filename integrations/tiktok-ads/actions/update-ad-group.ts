import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    adgroup_id: z.string().describe('Ad Group ID. Example: "1866248800809074"'),
    adgroup_name: z.string().optional().describe('New name for the ad group.'),
    budget: z.number().optional().describe('Ad group budget.'),
    bid_price: z.number().optional().describe('Bid price.'),
    bid_type: z.string().optional().describe('Bid type.'),
    schedule_start_time: z.string().optional().describe('Schedule start time in UTC. Example: "2026-05-27T00:00:00Z"'),
    schedule_end_time: z.string().optional().describe('Schedule end time in UTC. Example: "2026-06-27T00:00:00Z"'),
    schedule_type: z.string().optional().describe('Schedule type.'),
    pacing: z.string().optional().describe('Delivery pacing.'),
    comment_disabled: z.boolean().optional().describe('Whether comments are disabled.'),
    share_disabled: z.boolean().optional().describe('Whether sharing is disabled.'),
    auto_targeting_enabled: z.boolean().optional().describe('Whether auto-targeting is enabled.'),
    age_groups: z.array(z.string()).optional().describe('Age groups to target.'),
    gender: z.string().optional().describe('Gender targeting.'),
    languages: z.array(z.string()).optional().describe('Languages to target.'),
    location_ids: z.array(z.string()).optional().describe('Location IDs to target.'),
    interest_category_ids: z.array(z.string()).optional().describe('Interest category IDs.'),
    audience_ids: z.array(z.string()).optional().describe('Audience IDs to include.'),
    excluded_audience_ids: z.array(z.string()).optional().describe('Audience IDs to exclude.'),
    operating_systems: z.array(z.string()).optional().describe('Operating systems to target.'),
    network_types: z.array(z.string()).optional().describe('Network types.'),
    dayparting: z.string().optional().describe('Dayparting schedule.'),
    deep_bid_type: z.string().optional().describe('Deep bid type.'),
    conversion_bid_price: z.number().optional().describe('Conversion bid price.'),
    roas_bid: z.number().optional().describe('ROAS bid.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            adgroup_id: z.string(),
            success: z.boolean().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    adgroup_id: z.string(),
    success: z.boolean().optional()
});

const action = createAction({
    description: 'Update an ad group in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['adgroup'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739586761631745
            endpoint: 'adgroup/update/',
            data: {
                advertiser_id: input.advertiser_id,
                adgroup_id: input.adgroup_id,
                ...(input.adgroup_name !== undefined && { adgroup_name: input.adgroup_name }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.bid_price !== undefined && { bid_price: input.bid_price }),
                ...(input.bid_type !== undefined && { bid_type: input.bid_type }),
                ...(input.schedule_start_time !== undefined && { schedule_start_time: input.schedule_start_time }),
                ...(input.schedule_end_time !== undefined && { schedule_end_time: input.schedule_end_time }),
                ...(input.schedule_type !== undefined && { schedule_type: input.schedule_type }),
                ...(input.pacing !== undefined && { pacing: input.pacing }),
                ...(input.comment_disabled !== undefined && { comment_disabled: input.comment_disabled }),
                ...(input.share_disabled !== undefined && { share_disabled: input.share_disabled }),
                ...(input.auto_targeting_enabled !== undefined && { auto_targeting_enabled: input.auto_targeting_enabled }),
                ...(input.age_groups !== undefined && { age_groups: input.age_groups }),
                ...(input.gender !== undefined && { gender: input.gender }),
                ...(input.languages !== undefined && { languages: input.languages }),
                ...(input.location_ids !== undefined && { location_ids: input.location_ids }),
                ...(input.interest_category_ids !== undefined && { interest_category_ids: input.interest_category_ids }),
                ...(input.audience_ids !== undefined && { audience_ids: input.audience_ids }),
                ...(input.excluded_audience_ids !== undefined && { excluded_audience_ids: input.excluded_audience_ids }),
                ...(input.operating_systems !== undefined && { operating_systems: input.operating_systems }),
                ...(input.network_types !== undefined && { network_types: input.network_types }),
                ...(input.dayparting !== undefined && { dayparting: input.dayparting }),
                ...(input.deep_bid_type !== undefined && { deep_bid_type: input.deep_bid_type }),
                ...(input.conversion_bid_price !== undefined && { conversion_bid_price: input.conversion_bid_price }),
                ...(input.roas_bid !== undefined && { roas_bid: input.roas_bid })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            adgroup_id: providerResponse.data?.adgroup_id || input.adgroup_id,
            ...(providerResponse.data?.success !== undefined && { success: providerResponse.data.success })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
