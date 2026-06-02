import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return. Defaults to 10.'),
    customer: z.string().optional().describe('Only return PaymentIntents for the customer specified by this customer ID.'),
    created_gte: z.number().int().optional().describe('Filter by creation time: minimum timestamp (inclusive).'),
    created_lte: z.number().int().optional().describe('Filter by creation time: maximum timestamp (inclusive).'),
    status: z.string().optional().describe('Only return PaymentIntents with the specified status.')
});

const PaymentIntentSchema = z
    .object({
        id: z.string(),
        object: z.literal('payment_intent'),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        created: z.number(),
        livemode: z.boolean()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(PaymentIntentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payment intents from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-payment-intents',
        group: 'Payment Intents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.stripe.com/api/payment_intents/list
            endpoint: '/v1/payment_intents',
            params: {
                ...(input.cursor !== undefined && { starting_after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.customer !== undefined && { customer: input.customer }),
                ...(input.created_gte !== undefined && { 'created[gte]': String(input.created_gte) }),
                ...(input.created_lte !== undefined && { 'created[lte]': String(input.created_lte) }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });

        const listResponse = z
            .object({
                object: z.literal('list'),
                data: z.array(z.unknown()),
                has_more: z.boolean()
            })
            .parse(response.data);

        const items = listResponse.data.map((item) => PaymentIntentSchema.parse(item));

        const result: z.infer<typeof OutputSchema> = { items };
        const lastItem = items.at(-1);
        if (listResponse.has_more && lastItem !== undefined) {
            result.next_cursor = lastItem.id;
        }
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
