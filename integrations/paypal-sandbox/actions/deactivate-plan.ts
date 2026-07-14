import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const InputSchema = z.object({
    plan_id: z.string().describe('PayPal billing plan ID to deactivate. Example: "P-3F897353EP795272HNJKULHQ"'),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
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
            headers: {
                // One idempotency key per execution so retries resolve to the same deactivation.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
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
