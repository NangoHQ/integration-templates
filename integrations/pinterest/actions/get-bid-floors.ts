import { z } from 'zod';
import { createAction } from 'nango';

const BidFloorSpecSchema = z.object({
    billable_event: z.string().describe('Ad group billable event type. Example: "CLICKTHROUGH"'),
    countries: z.array(z.string()).optional().describe('List of ISO 3166-1 alpha-2 country codes. Example: ["US"]'),
    creative_type: z.string().optional().describe('Creative type for the bid floor request.'),
    currency: z.string().describe('Currency for the bid floor value. Example: "USD"'),
    objective_type: z.string().optional().describe('Campaign objective type. Example: "AWARENESS"'),
    optimization_goal_metadata: z.record(z.string(), z.unknown()).optional().describe('Optimization goal metadata.')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    bid_floor_specs: z.array(BidFloorSpecSchema).describe('List of bid floor specifications.'),
    targeting_spec: z.record(z.string(), z.unknown()).optional().describe('Ad group targeting specification.')
});

const OutputSchema = z.object({
    bid_floors: z.array(z.number()).describe('A list of bid floors in micro currency. Example: [100000, 200000]'),
    type: z.string().describe('Always the string "bidfloor".')
});

const action = createAction({
    description: 'Get the minimum allowed bid for given objective/billable-event combinations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups_bid_floor/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/bid_floor`,
            data: {
                bid_floor_specs: input.bid_floor_specs,
                ...(input.targeting_spec !== undefined && { targeting_spec: input.targeting_spec })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
