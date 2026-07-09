import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ad_group_id: z.string().describe('Ad group ID. Example: "2680091388706"')
});

const AdGroupSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string().optional(),
        campaign_id: z.string(),
        name: z.string(),
        status: z.string().optional(),
        summary_status: z.string().optional(),
        billable_event: z.string().optional(),
        budget_in_micro_currency: z.number().nullable().optional(),
        bid_in_micro_currency: z.number().nullable().optional(),
        start_time: z.number().nullable().optional(),
        end_time: z.number().nullable().optional(),
        targeting_spec: z.unknown().nullable().optional(),
        tracking_urls: z.unknown().nullable().optional(),
        created_time: z.number().optional(),
        updated_time: z.number().optional(),
        type: z.string().optional(),
        auto_targeting_enabled: z.boolean().nullable().optional(),
        placement_group: z.string().optional(),
        budget_type: z.string().optional(),
        pacing_delivery_type: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an ad group.',
    version: '1.0.0',
    input: InputSchema,
    output: AdGroupSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof AdGroupSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/ad_groups-get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups/${encodeURIComponent(input.ad_group_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ad group not found',
                ad_account_id: input.ad_account_id,
                ad_group_id: input.ad_group_id
            });
        }

        const adGroup = AdGroupSchema.parse(response.data);
        return adGroup;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
