import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to update. Example: "dc26d923-cb1e-45ab-adda-372cb0a4e550"'),
    card_id: z.string().nullable().optional().describe("The ID of the subscriber's card used to charge for the subscription. Set to null to clear."),
    canceled_date: z.string().nullable().optional().describe('YYYY-MM-DD formatted date to cancel the subscription. Set to null to clear.'),
    tax_percentage: z.string().nullable().optional().describe('Tax percentage in decimal form without a % sign. Example: "7.5" for 7.5%.'),
    price_override_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .nullable()
        .optional()
        .describe('Custom price override for STATIC-priced subscription plan variations.'),
    version: z.number().optional().describe('Current version of the subscription for optimistic locking. If omitted, the action fetches it automatically.')
});

const MoneySchema = z.object({
    amount: z.number().nullable().optional(),
    currency: z.string().nullable().optional()
});

const SubscriptionSourceSchema = z.object({
    name: z.string().nullable().optional()
});

const SubscriptionSchema = z.object({
    id: z.string(),
    location_id: z.string().optional(),
    plan_variation_id: z.string().optional(),
    customer_id: z.string().optional(),
    start_date: z.string().optional(),
    canceled_date: z.string().nullable().optional(),
    charged_through_date: z.string().optional(),
    status: z.string().optional(),
    tax_percentage: z.string().nullable().optional(),
    invoice_ids: z.array(z.string()).optional(),
    price_override_money: MoneySchema.nullable().optional(),
    version: z.number().optional(),
    created_at: z.string().optional(),
    card_id: z.string().nullable().optional(),
    timezone: z.string().optional(),
    source: SubscriptionSourceSchema.nullable().optional(),
    monthly_billing_anchor_date: z.number().optional(),
    completed_date: z.string().nullable().optional()
});

const action = createAction({
    description: 'Update a subscription (e.g. swap card_id).',
    version: '1.0.0',
    input: InputSchema,
    output: SubscriptionSchema,
    scopes: ['SUBSCRIPTIONS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof SubscriptionSchema>> => {
        let version = input.version;
        if (version === undefined) {
            // https://developer.squareup.com/reference/square/subscriptions-api/retrieve-subscription
            const getResponse = await nango.get({
                endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}`,
                retries: 3
            });

            if (!getResponse.data || !getResponse.data.subscription) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Subscription not found',
                    subscription_id: input.subscription_id
                });
            }

            const providerSubscription = SubscriptionSchema.parse(getResponse.data.subscription);
            version = providerSubscription.version;
        }

        if (version === undefined) {
            throw new nango.ActionError({
                type: 'missing_version',
                message: 'Subscription version is required for updates but was not found.'
            });
        }

        const subscriptionUpdate: Record<string, unknown> = {
            version: version
        };

        if (input.card_id !== undefined) {
            subscriptionUpdate['card_id'] = input.card_id;
        }
        if (input.canceled_date !== undefined) {
            subscriptionUpdate['canceled_date'] = input.canceled_date;
        }
        if (input.tax_percentage !== undefined) {
            subscriptionUpdate['tax_percentage'] = input.tax_percentage;
        }
        if (input.price_override_money !== undefined) {
            subscriptionUpdate['price_override_money'] = input.price_override_money;
        }

        // https://developer.squareup.com/reference/square/subscriptions-api/update-subscription
        const response = await nango.put({
            endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}`,
            data: {
                subscription: subscriptionUpdate
            },
            retries: 1
        });

        if (!response.data || !response.data.subscription) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update subscription',
                subscription_id: input.subscription_id
            });
        }

        return SubscriptionSchema.parse(response.data.subscription);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
