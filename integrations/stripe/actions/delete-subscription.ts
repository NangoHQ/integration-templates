import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the subscription to delete. Example: sub_xxx')
});

const ProviderSubscriptionSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    object: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a subscription in Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.stripe.com/api/subscriptions/delete
            endpoint: `/v1/subscriptions/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerSubscription = ProviderSubscriptionSchema.parse(response.data);

        return {
            id: providerSubscription.id,
            ...(providerSubscription.status !== undefined && { status: providerSubscription.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
