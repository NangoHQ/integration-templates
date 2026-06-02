import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.'),
    active: z.boolean().optional().describe('Only return prices that are active or inactive (e.g., pass false to list all inactive prices).'),
    product: z.string().optional().describe('Only return prices for the given product.'),
    type: z.enum(['one_time', 'recurring']).optional().describe('Only return prices of type recurring or one_time.'),
    currency: z.string().optional().describe('Only return prices for the given currency.')
});

const RecurringSchema = z
    .object({
        interval: z.string().optional(),
        interval_count: z.number().optional(),
        trial_period_days: z.number().nullable().optional(),
        usage_type: z.string().optional()
    })
    .nullable()
    .optional();

const PriceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        active: z.boolean(),
        billing_scheme: z.string().nullable().optional(),
        created: z.number(),
        currency: z.string(),
        custom_unit_amount: z
            .object({
                enabled: z.boolean().nullable().optional(),
                maximum: z.number().nullable().optional(),
                minimum: z.number().nullable().optional(),
                preset: z.number().nullable().optional()
            })
            .nullable()
            .optional(),
        livemode: z.boolean(),
        lookup_key: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        nickname: z.string().nullable().optional(),
        product: z.string().nullable().optional(),
        recurring: RecurringSchema,
        tax_behavior: z.string().nullable().optional(),
        tiers_mode: z.string().nullable().optional(),
        transform_quantity: z.unknown().nullable().optional(),
        type: z.enum(['one_time', 'recurring']),
        unit_amount: z.number().nullable().optional(),
        unit_amount_decimal: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    prices: z.array(PriceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List prices from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-prices',
        group: 'Prices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.stripe.com/api/prices/list
        const response = await nango.get({
            endpoint: '/v1/prices',
            params: {
                ...(input.cursor !== undefined && { starting_after: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.active !== undefined && { active: String(input.active) }),
                ...(input.product !== undefined && { product: input.product }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.currency !== undefined && { currency: input.currency })
            },
            retries: 3
        });

        const ProviderListSchema = z.object({
            object: z.string().optional(),
            data: z.array(z.unknown()),
            has_more: z.boolean().optional(),
            url: z.string().optional()
        });

        const providerResponse = ProviderListSchema.parse(response.data);

        const prices = providerResponse.data.map((item) => {
            return PriceSchema.parse(item);
        });

        const lastPrice = prices[prices.length - 1];
        const nextCursor = providerResponse.has_more && lastPrice !== undefined ? lastPrice.id : undefined;

        return {
            prices,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
