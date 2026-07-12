import { z } from 'zod';
import { createAction } from 'nango';

const AdGroupUpdateSchema = z
    .object({
        id: z.string().describe('Ad group ID. Example: "2680091388832"'),
        name: z.string().optional().describe('Ad group name.'),
        status: z.string().optional().describe('Ad group/entity status. Example: "ACTIVE", "PAUSED", "ARCHIVED".'),
        bid_in_micro_currency: z.number().optional().nullable().describe('Bid price in micro currency.'),
        budget_in_micro_currency: z.number().optional().nullable().describe('Budget in micro currency. Do not set for CBO campaigns.'),
        bid_multiplier: z.number().optional().describe('Bid multiplier. Enter 0 to remove.'),
        bid_strategy_type: z.string().optional().describe('Bid strategy type.'),
        billable_event: z.string().optional().describe('Billable event type.'),
        budget_type: z.string().optional().describe('Budget type. Example: "DAILY".'),
        campaign_id: z.string().optional().describe('Campaign ID of the ad group.'),
        customer_segment_id: z.string().optional().describe('Customer segment ID. Set to "0" to clear.'),
        end_time: z.number().optional().nullable().describe('End time as Unix timestamp in seconds.'),
        start_time: z.number().optional().nullable().describe('Start time as Unix timestamp in seconds.'),
        targeting_spec: z.record(z.string(), z.unknown()).optional().describe('Targeting spec object.'),
        targeting_template_ids: z.array(z.string()).optional().nullable().describe('Targeting template IDs. Set to ["0"] to clear.'),
        tracking_urls: z.record(z.string(), z.unknown()).optional().describe('Tracking URLs object.'),
        auto_targeting_enabled: z.boolean().optional().nullable().describe('Enable auto-targeting.'),
        is_creative_optimization: z.boolean().optional().nullable().describe('Enable creative optimization.'),
        placement_group: z.string().optional().describe('Placement group.'),
        pacing_delivery_type: z.string().optional().describe('Pacing delivery type.'),
        promotion_id: z.string().optional().nullable().describe('Promotion ID. Set to null to clear.'),
        promotion_ids: z.array(z.string()).optional().describe('Promotion IDs list. Set to empty array to clear.')
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ad_groups: z.array(AdGroupUpdateSchema).min(1).max(30).describe('Array of ad group updates. Each element must include an id.')
});

const BatchItemExceptionSchema = z.object({
    message: z.string().optional(),
    error_code: z.number().optional()
});

const AdGroupSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        campaign_id: z.string().optional(),
        status: z.string().optional(),
        bid_in_micro_currency: z.number().nullable().optional(),
        budget_in_micro_currency: z.number().nullable().optional(),
        bid_multiplier: z.number().nullable().optional(),
        bid_strategy_type: z.string().optional(),
        billable_event: z.string().optional(),
        budget_type: z.string().optional(),
        customer_segment_id: z.string().optional(),
        end_time: z.number().nullable().optional(),
        start_time: z.number().nullable().optional(),
        targeting_spec: z.record(z.string(), z.unknown()).nullable().optional(),
        targeting_template_ids: z.array(z.string()).nullable().optional(),
        tracking_urls: z.record(z.string(), z.unknown()).nullable().optional(),
        auto_targeting_enabled: z.boolean().nullable().optional(),
        is_creative_optimization: z.boolean().nullable().optional(),
        placement_group: z.string().optional(),
        pacing_delivery_type: z.string().optional(),
        promotion_id: z.string().nullable().optional(),
        promotion_ids: z.array(z.string()).optional(),
        ad_account_id: z.string().optional(),
        created_time: z.number().optional(),
        updated_time: z.number().optional(),
        summary_status: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(
        z.object({
            data: AdGroupSchema.optional(),
            exceptions: z.array(BatchItemExceptionSchema).optional()
        })
    )
});

const action = createAction({
    description: 'Update one or more ad groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups`,
            data: input.ad_groups,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response shape.',
                details: parsed.error.message
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
