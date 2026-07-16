import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to cancel. Example: "c1fd8f96-a883-4f62-a5fb-006272e7dbb8"')
});

const SubscriptionSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    subscription: SubscriptionSchema
});

const ResponseSchema = z.object({
    subscription: z.unknown().optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Cancel a subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/subscriptions-api/cancel-subscription
            endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}/cancel`,
            retries: 3
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Square API',
                subscription_id: input.subscription_id
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors',
                errors: parsed.data.errors,
                subscription_id: input.subscription_id
            });
        }

        if (!parsed.data.subscription) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Subscription not found or could not be canceled',
                subscription_id: input.subscription_id
            });
        }

        const subscription = SubscriptionSchema.parse(parsed.data.subscription);

        return {
            subscription
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
