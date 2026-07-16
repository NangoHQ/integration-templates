import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to resume. Example: "56214fb2-cc85-47a1-93bc-44f3766bb56f"'),
    resume_change_timing: z.string().describe('The timing to resume the subscription, relative to the resume_effective_date. Example: "IMMEDIATE"'),
    resume_effective_date: z.string().optional().describe('The YYYY-MM-DD-formatted date when the subscription reactivates. Example: "2023-09-01"')
});

const SubscriptionActionSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    effective_date: z.string().optional()
});

const SubscriptionSchema = z
    .object({
        id: z.string(),
        location_id: z.string().optional(),
        plan_variation_id: z.string().optional(),
        customer_id: z.string().optional(),
        start_date: z.string().optional(),
        status: z.string().optional(),
        version: z.number().optional(),
        created_at: z.string().optional(),
        card_id: z.string().optional(),
        timezone: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    subscription: SubscriptionSchema,
    actions: z.array(SubscriptionActionSchema).optional()
});

const ProviderResponseSchema = z.object({
    subscription: SubscriptionSchema.optional(),
    actions: z.array(SubscriptionActionSchema).optional(),
    errors: z
        .array(
            z.object({
                category: z.string().optional(),
                code: z.string().optional(),
                detail: z.string().optional(),
                field: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Resume a paused or deactivated subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/subscriptions-api/resume-subscription
            endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}/resume`,
            data: {
                resume_change_timing: input.resume_change_timing,
                ...(input.resume_effective_date !== undefined && { resume_effective_date: input.resume_effective_date })
            },
            // Resuming is not idempotent and Square does not support an idempotency_key for this
            // endpoint: a retry after a timeout could be rejected because the resume is already
            // scheduled, even though the subscription state already changed. Do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Square API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(rawData);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.detail ?? firstError.code ?? 'Unknown provider error',
                    errors: providerResponse.errors
                });
            }
        }

        if (!providerResponse.subscription) {
            throw new nango.ActionError({
                type: 'missing_subscription',
                message: 'Provider response did not contain a subscription.'
            });
        }

        return {
            subscription: providerResponse.subscription,
            ...(providerResponse.actions !== undefined && { actions: providerResponse.actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
