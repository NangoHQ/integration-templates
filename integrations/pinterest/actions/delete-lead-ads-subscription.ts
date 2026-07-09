import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    subscription_id: z.string().describe('Lead ads subscription ID. Example: "118139655868505199"')
});

const OutputSchema = z.object({
    ad_account_id: z.string(),
    subscription_id: z.string()
});

const action = createAction({
    description: 'Delete a lead ads webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/lead_ads_subscriptions/delete
        await nango.delete({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/leads/subscriptions/${encodeURIComponent(input.subscription_id)}`,
            retries: 1
        });

        return {
            ad_account_id: input.ad_account_id,
            subscription_id: input.subscription_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
