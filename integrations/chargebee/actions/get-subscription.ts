import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('Subscription ID. Example: "AzZPdjVMyVrz9acf"')
});

const SubscriptionSchema = z
    .object({
        id: z.string(),
        customer_id: z.string().optional(),
        status: z.string().optional(),
        plan_id: z.string().optional(),
        plan_quantity: z.number().optional(),
        plan_unit_price: z.number().optional(),
        currency_code: z.string().optional(),
        started_at: z.number().optional(),
        activated_at: z.number().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        current_term_start: z.number().optional(),
        current_term_end: z.number().optional(),
        next_billing_at: z.number().optional(),
        remaining_billing_cycles: z.number().optional(),
        deleted: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = SubscriptionSchema;

const action = createAction({
    description: 'Retrieve a single subscription by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/subscriptions
            endpoint: `/api/v2/subscriptions/${encodeURIComponent(input.subscription_id)}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('subscription' in raw)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Subscription not found or unexpected response format',
                subscription_id: input.subscription_id
            });
        }

        const subscription = SubscriptionSchema.parse(raw.subscription);
        return subscription;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
