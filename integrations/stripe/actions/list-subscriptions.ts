import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer: z.string().optional().describe('The ID of the customer whose subscriptions to retrieve. Example: "cus_xxx"'),
    status: z
        .enum(['active', 'canceled', 'ended', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid', 'all'])
        .optional()
        .describe('The status of the subscriptions to retrieve.'),
    collection_method: z.enum(['charge_automatically', 'send_invoice']).optional().describe('The collection method of the subscriptions to retrieve.'),
    price: z.string().optional().describe('Filter for subscriptions that contain this recurring price ID. Example: "price_xxx"'),
    created_after: z.number().optional().describe('Only return subscriptions created on or after this Unix timestamp.'),
    created_before: z.number().optional().describe('Only return subscriptions created on or before this Unix timestamp.'),
    limit: z.number().min(1).max(100).optional().describe('A limit on the number of objects to be returned, between 1 and 100. Default is 10.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to Stripe `starting_after`.')
});

const SubscriptionSchema = z
    .object({
        id: z.string(),
        object: z.literal('subscription'),
        status: z.string().optional(),
        customer: z.string().optional(),
        collection_method: z.string().optional(),
        created: z.number().optional(),
        current_period_start: z.number().optional(),
        current_period_end: z.number().optional(),
        cancel_at_period_end: z.boolean().optional(),
        canceled_at: z.number().nullable().optional(),
        ended_at: z.number().nullable().optional(),
        start_date: z.number().optional(),
        trial_start: z.number().nullable().optional(),
        trial_end: z.number().nullable().optional(),
        latest_invoice: z.string().nullable().optional(),
        default_payment_method: z.string().nullable().optional(),
        items: z
            .object({
                object: z.literal('list'),
                data: z.array(z.unknown()),
                has_more: z.boolean(),
                url: z.string()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(SubscriptionSchema),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    object: z.literal('list'),
    data: z.array(z.unknown()),
    has_more: z.boolean(),
    url: z.string()
});

const action = createAction({
    description: 'List subscriptions from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-subscriptions',
        group: 'Subscriptions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.stripe.com/api/subscriptions/list
        const response = await nango.get({
            endpoint: '/v1/subscriptions',
            params: {
                ...(input.customer !== undefined && { customer: input.customer }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.collection_method !== undefined && { collection_method: input.collection_method }),
                ...(input.price !== undefined && { price: input.price }),
                ...(input.created_after !== undefined && { 'created[gte]': String(input.created_after) }),
                ...(input.created_before !== undefined && { 'created[lte]': String(input.created_before) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { starting_after: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            return SubscriptionSchema.parse(item);
        });

        const lastItem = items.at(-1);

        return {
            items,
            ...(providerResponse.has_more && lastItem !== undefined ? { next_cursor: lastItem.id } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
