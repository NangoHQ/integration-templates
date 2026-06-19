import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    setup_intent_id: z.string().describe('The ID of the SetupIntent to cancel. Example: seti_xxx'),
    cancellation_reason: z.enum(['abandoned', 'requested_by_customer', 'duplicate']).optional().describe('Reason for canceling the SetupIntent.')
});

const ProviderSetupIntentSchema = z.object({
    id: z.string(),
    object: z.string(),
    cancellation_reason: z.string().nullable().optional(),
    client_secret: z.string().nullable().optional(),
    created: z.number().optional(),
    customer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    last_setup_error: z.unknown().nullable().optional(),
    latest_attempt: z.string().nullable().optional(),
    livemode: z.boolean().optional(),
    mandate: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    next_action: z.unknown().nullable().optional(),
    on_behalf_of: z.string().nullable().optional(),
    payment_method: z.string().nullable().optional(),
    payment_method_options: z.record(z.string(), z.unknown()).optional(),
    payment_method_types: z.array(z.string()).optional(),
    single_use_mandate: z.string().nullable().optional(),
    status: z.string(),
    usage: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    cancellation_reason: z.string().optional(),
    customer: z.string().optional(),
    payment_method: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a setup intent in Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://docs.stripe.com/api/setup_intents/cancel
            endpoint: `/v1/setup_intents/${encodeURIComponent(input.setup_intent_id)}/cancel`,
            data: {
                ...(input.cancellation_reason !== undefined && { cancellation_reason: input.cancellation_reason })
            },
            retries: 3
        });

        const setupIntent = ProviderSetupIntentSchema.parse(response.data);

        return {
            id: setupIntent.id,
            status: setupIntent.status,
            ...(setupIntent.cancellation_reason != null && { cancellation_reason: setupIntent.cancellation_reason }),
            ...(setupIntent.customer != null && { customer: setupIntent.customer }),
            ...(setupIntent.payment_method != null && { payment_method: setupIntent.payment_method })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
