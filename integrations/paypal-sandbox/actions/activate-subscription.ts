import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('The subscription ID. Example: "I-J865PV7D94N2"'),
    reason: z.string().min(1).max(128).describe('The reason for reactivating the subscription. Example: "Reactivating the subscription"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    subscription_id: z.string(),
    error: z.unknown().optional()
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const SubscriptionStatusSchema = z.object({
    status: z.string()
});

const action = createAction({
    description: 'Reactivate a suspended subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch PayPal returns 422 when the subscription is not in a suspended state (e.g. APPROVAL_PENDING).
        // We return a structured result instead of throwing so callers can distinguish state issues from unexpected failures.
        try {
            // https://developer.paypal.com/api/subscriptions/v1/#subscriptions_activate
            response = await nango.post({
                endpoint: `/v1/billing/subscriptions/${encodeURIComponent(input.subscription_id)}/activate`,
                data: { reason: input.reason },
                retries: 3
            });
        } catch (error) {
            const parsed = HttpErrorSchema.safeParse(error);
            if (parsed.success && parsed.data.response.status === 422) {
                // This endpoint doesn't support an idempotency key, so a 422 here can mean either a genuine
                // state conflict, or a retry after a first call that actually succeeded but whose response was
                // lost. Check the subscription's current status before reporting failure, so a lost-but-successful
                // activation isn't misreported as failed.
                const current = await nango.get({
                    endpoint: `/v1/billing/subscriptions/${encodeURIComponent(input.subscription_id)}`,
                    retries: 3
                });
                const parsedStatus = SubscriptionStatusSchema.safeParse(current.data);
                if (parsedStatus.success && parsedStatus.data.status === 'ACTIVE') {
                    return {
                        success: true,
                        subscription_id: input.subscription_id
                    };
                }

                return {
                    success: false,
                    subscription_id: input.subscription_id,
                    error: parsed.data.response.data
                };
            }
            throw error;
        }

        if (response && typeof response.status === 'number' && response.status >= 400) {
            return {
                success: false,
                subscription_id: input.subscription_id,
                error: response.data
            };
        }

        return {
            success: true,
            subscription_id: input.subscription_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
