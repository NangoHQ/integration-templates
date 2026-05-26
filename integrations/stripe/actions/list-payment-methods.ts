import { z } from 'zod';
import { createAction } from 'nango';

const ListInputSchema = z.object({
    customer: z.string().optional().describe('The ID of the customer whose PaymentMethods will be retrieved. Example: "cus_Uae6TTxHlP2hxk"'),
    type: z.string().optional().describe('Filters the list by the object type field. Example: "card"'),
    limit: z.number().min(1).max(100).optional().describe('A limit on the number of objects to be returned, between 1 and 100. Default is 10.'),
    cursor: z.string().optional().describe('Pagination cursor (starting_after) from the previous response. Omit for the first page.')
});

const ProviderPaymentMethodSchema = z
    .object({
        id: z.string(),
        object: z.string(),
        created: z.number().optional(),
        customer: z.string().optional(),
        livemode: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        type: z.string().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(ProviderPaymentMethodSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payment methods from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-payment-methods',
        group: 'Payment Methods'
    },
    input: ListInputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {
            ...(input.customer !== undefined && { customer: input.customer }),
            ...(input.type !== undefined && { type: input.type }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.cursor !== undefined && { starting_after: input.cursor })
        };

        const response = await nango.get({
            // https://docs.stripe.com/api/payment_methods/list
            endpoint: '/v1/payment_methods',
            params,
            retries: 3
        });

        const ProviderListSchema = z.object({
            object: z.string(),
            data: z.array(z.unknown()),
            has_more: z.boolean()
        });

        const providerList = ProviderListSchema.parse(response.data);
        const items = providerList.data.map((item) => ProviderPaymentMethodSchema.parse(item));

        const lastItem = items[items.length - 1];
        return {
            items,
            ...(providerList.has_more && lastItem !== undefined ? { next_cursor: lastItem.id } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
