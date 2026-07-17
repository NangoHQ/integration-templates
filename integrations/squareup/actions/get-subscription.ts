import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to retrieve. Example: "dc26d923-cb1e-45ab-adda-372cb0a4e550"')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const SubscriptionSourceSchema = z.object({
    name: z.string().optional()
});

const SubscriptionSchema = z
    .object({
        id: z.string(),
        location_id: z.string(),
        plan_id: z.string().optional(),
        plan_variation_id: z.string().optional(),
        customer_id: z.string().optional(),
        card_id: z.string().optional(),
        start_date: z.string().optional(),
        charged_through_date: z.string().optional(),
        status: z.string().optional(),
        invoice_ids: z.array(z.string()).optional(),
        price_override_money: MoneySchema.optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        paid_until_date: z.string().optional(),
        cancelled_date: z.string().optional(),
        canceled_date: z.string().optional(),
        timezone: z.string().optional(),
        source: SubscriptionSourceSchema.optional(),
        version: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    subscription: SubscriptionSchema.optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = SubscriptionSchema;

const action = createAction({
    description: 'Retrieve a subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/subscriptions-api/retrieve-subscription
            endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}`,
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        if (!body.subscription) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Subscription not found',
                subscription_id: input.subscription_id
            });
        }

        return body.subscription;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
