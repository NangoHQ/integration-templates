import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    plan_id: z.string().describe('PayPal billing plan ID to deactivate. Example: "P-3F897353EP795272HNJKULHQ"')
});

const OutputSchema = z.object({
    plan_id: z.string(),
    deactivated: z.boolean()
});

const action = createAction({
    description: 'Deactivate a billing plan so it can no longer be subscribed to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/api/rest/subscriptions/plans/#plans_deactivate
        await nango.post({
            endpoint: `/v1/billing/plans/${encodeURIComponent(input.plan_id)}/deactivate`,
            retries: 3
        });

        return {
            plan_id: input.plan_id,
            deactivated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
