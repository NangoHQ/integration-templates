import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The ID of the subscription to pause. Example: "56214fb2-cc85-47a1-93bc-44f3766bb56f"'),
    pause_effective_date: z.string().optional().describe('The YYYY-MM-DD-formatted date when the scheduled PAUSE action takes place.'),
    pause_cycle_duration: z.number().int().optional().describe('The number of billing cycles the subscription will be paused before it is reactivated.'),
    resume_effective_date: z.string().optional().describe('The date when the subscription is reactivated by a scheduled RESUME action.'),
    resume_change_timing: z.string().optional().describe('The timing whether the subscription is reactivated immediately or at the end of the billing cycle.'),
    pause_reason: z.string().max(255).optional().describe('The user-provided reason to pause the subscription.')
});

const ProviderErrorSchema = z.object({
    category: z.string().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
    field: z.string().optional()
});

const ProviderSubscriptionSchema = z
    .object({
        id: z.string(),
        location_id: z.string().optional(),
        plan_variation_id: z.string().optional(),
        customer_id: z.string().optional(),
        start_date: z.string().optional(),
        status: z.string(),
        version: z.number().int().optional(),
        created_at: z.string().optional(),
        card_id: z.string().optional(),
        timezone: z.string().optional()
    })
    .passthrough();

const ProviderActionSchema = z
    .object({
        id: z.string().optional(),
        type: z.string().optional(),
        effective_date: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    errors: z.array(ProviderErrorSchema).optional(),
    subscription: ProviderSubscriptionSchema.optional(),
    actions: z.array(ProviderActionSchema).optional()
});

const OutputSchema = z.object({
    subscription: z
        .object({
            id: z.string(),
            location_id: z.string().optional(),
            plan_variation_id: z.string().optional(),
            customer_id: z.string().optional(),
            start_date: z.string().optional(),
            status: z.string(),
            version: z.number().int().optional(),
            created_at: z.string().optional(),
            card_id: z.string().optional(),
            timezone: z.string().optional()
        })
        .passthrough()
        .optional(),
    actions: z
        .array(
            z
                .object({
                    id: z.string().optional(),
                    type: z.string().optional(),
                    effective_date: z.string().optional()
                })
                .passthrough()
        )
        .optional()
});

const action = createAction({
    description: 'Pause an active subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            pause_effective_date?: string;
            pause_cycle_duration?: number;
            resume_effective_date?: string;
            resume_change_timing?: string;
            pause_reason?: string;
        } = {};
        if (input.pause_effective_date !== undefined) {
            body.pause_effective_date = input.pause_effective_date;
        }
        if (input.pause_cycle_duration !== undefined) {
            body.pause_cycle_duration = input.pause_cycle_duration;
        }
        if (input.resume_effective_date !== undefined) {
            body.resume_effective_date = input.resume_effective_date;
        }
        if (input.resume_change_timing !== undefined) {
            body.resume_change_timing = input.resume_change_timing;
        }
        if (input.pause_reason !== undefined) {
            body.pause_reason = input.pause_reason;
        }

        const response = await nango.post({
            // https://developer.squareup.com/reference/square/subscriptions-api/pause-subscription
            endpoint: `/v2/subscriptions/${encodeURIComponent(input.subscription_id)}/pause`,
            data: body,
            // Pausing schedules a PAUSE action rather than applying immediately, and Square does
            // not support an idempotency_key for this endpoint. A retry after a timeout could be
            // rejected because the pause is already scheduled, even though the subscription
            // state already changed. Do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.detail || firstError.code || 'Square API returned an error',
                    code: firstError.code,
                    category: firstError.category
                });
            }
        }

        return {
            ...(parsed.subscription != null && { subscription: parsed.subscription }),
            ...(parsed.actions != null && { actions: parsed.actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
