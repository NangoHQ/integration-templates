import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the price to retrieve. Example: "price_1MoBy5LkdIwHu7ixZhnattbh"')
});

const RecurringSchema = z.object({
    interval: z.enum(['day', 'week', 'month', 'year']),
    interval_count: z.number(),
    meter: z.string().nullable().optional(),
    usage_type: z.enum(['metered', 'licensed'])
});

const TierSchema = z.object({
    flat_amount: z.number().nullable(),
    flat_amount_decimal: z.string().nullable(),
    unit_amount: z.number().nullable(),
    unit_amount_decimal: z.string().nullable(),
    up_to: z.number().nullable()
});

const TransformQuantitySchema = z.object({
    divide_by: z.number(),
    round: z.enum(['up', 'down'])
});

const CustomUnitAmountSchema = z.object({
    maximum: z.number().nullable(),
    minimum: z.number().nullable(),
    preset: z.number().nullable()
});

const PriceSchema = z.object({
    id: z.string(),
    object: z.string(),
    active: z.boolean(),
    billing_scheme: z.enum(['per_unit', 'tiered']),
    created: z.number(),
    currency: z.string(),
    currency_options: z.record(z.string(), z.unknown()).nullable().optional(),
    custom_unit_amount: CustomUnitAmountSchema.nullable().optional(),
    livemode: z.boolean(),
    lookup_key: z.string().nullable(),
    metadata: z.record(z.string(), z.string()),
    nickname: z.string().nullable(),
    product: z.string(),
    recurring: RecurringSchema.nullable(),
    tax_behavior: z.enum(['exclusive', 'inclusive', 'unspecified']).nullable(),
    tiers: z.array(TierSchema).nullable().optional(),
    tiers_mode: z.enum(['graduated', 'volume']).nullable(),
    transform_quantity: TransformQuantitySchema.nullable().optional(),
    type: z.enum(['one_time', 'recurring']),
    unit_amount: z.number().nullable(),
    unit_amount_decimal: z.string().nullable()
});

const action = createAction({
    description: 'Retrieve a single price from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-price',
        group: 'Prices'
    },
    input: InputSchema,
    output: PriceSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof PriceSchema>> => {
        // https://docs.stripe.com/api/prices/retrieve
        const response = await nango.get({
            endpoint: `/v1/prices/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Price not found',
                id: input.id
            });
        }

        const price = PriceSchema.parse(response.data);
        return price;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
