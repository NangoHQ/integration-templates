import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to cancel. Example: "c1fd8f96-a883-4f62-a5fb-006272e7dbb8"')
});

const SubscriptionSchema = z.object({}).passthrough();

const SubscriptionActionSchema = z
    .object({
        id: z.string().optional(),
        type: z.string().optional(),
        effective_date: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    subscription: SubscriptionSchema,
    // https://developer.squareup.com/reference/square/subscriptions-api/cancel-subscription
    // Cancel schedules a CANCEL action rather than taking effect immediately, and the response
    // includes it (the same shape returned by pause/resume).
    actions: z.array(SubscriptionActionSchema).optional()
});

const ResponseSchema = z.object({
    subscription: z.unknown().optional(),
    actions: z.array(z.record(z.string(), z.unknown())).optional(),
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
            // Cancel schedules a CANCEL action rather than applying immediately, and Square does
            // not support an idempotency_key for this endpoint. A retry after a timeout could be
            // rejected because the cancellation is already scheduled, even though the
            // subscription state already changed. Do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
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
        const actions = parsed.data.actions ? z.array(SubscriptionActionSchema).parse(parsed.data.actions) : undefined;

        return {
            subscription,
            ...(actions !== undefined && { actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
