import { createAction } from 'nango';
import { z } from 'zod';

const AppliesToSchema = z.object({
    entity: z.enum(['products', 'categories']).describe('What the discount applies to. Example: "categories"'),
    ids: z.array(z.number()).describe('Array of product or category IDs. Example: [0]')
});

const InputSchema = z.object({
    id: z.number().describe('ID of the coupon to update. Example: 1'),
    name: z.string().optional().describe('Name of the coupon. Example: "$5 off"'),
    type: z
        .enum(['per_item_discount', 'per_total_discount', 'shipping_discount', 'free_shipping', 'percentage_discount', 'promotion'])
        .optional()
        .describe('Type of coupon. Example: "per_total_discount"'),
    amount: z.string().optional().describe('Discount amount or percentage. Example: "5.0000"'),
    code: z.string().optional().describe('Unique coupon code. Example: "S2549JM0Y"'),
    applies_to: AppliesToSchema.optional().describe('What the discount applies to. Omitting this field clears the existing value.'),
    min_purchase: z.string().optional().describe('Minimum purchase amount required. Example: "0.0000"'),
    max_uses: z.number().optional().describe('Maximum number of times the coupon can be used. Example: 0'),
    max_uses_per_customer: z.number().optional().describe('Maximum number of times the coupon can be used per customer. Example: 0'),
    enabled: z.boolean().optional().describe('Whether the coupon is enabled. Example: true'),
    expires: z.string().optional().describe('Expiration date string. Example: ""'),
    restricted_to: z.record(z.string(), z.unknown()).optional().describe('Restrictions object.'),
    shipping_methods: z.array(z.string()).optional().describe('Shipping method names.')
});

const ProviderCouponSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        amount: z.string().optional(),
        min_purchase: z.string().optional(),
        expires: z.string().optional(),
        enabled: z.boolean().optional(),
        code: z.string().optional(),
        applies_to: AppliesToSchema.optional(),
        num_uses: z.number().optional(),
        max_uses: z.number().optional(),
        max_uses_per_customer: z.number().optional(),
        restricted_to: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
        shipping_methods: z.array(z.string()).nullable().optional(),
        date_created: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().describe('Coupon ID.'),
    name: z.string().optional().describe('Coupon name.'),
    type: z.string().optional().describe('Coupon type.'),
    amount: z.string().optional().describe('Discount amount.'),
    min_purchase: z.string().optional().describe('Minimum purchase amount.'),
    expires: z.string().optional().describe('Expiration date.'),
    enabled: z.boolean().optional().describe('Whether the coupon is enabled.'),
    code: z.string().optional().describe('Coupon code.'),
    applies_to: AppliesToSchema.optional().describe('What the discount applies to.'),
    num_uses: z.number().optional().describe('Number of times the coupon has been used.'),
    max_uses: z.number().optional().describe('Maximum number of uses.'),
    max_uses_per_customer: z.number().optional().describe('Max uses per customer.'),
    restricted_to: z
        .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
        .optional()
        .describe('Restrictions.'),
    shipping_methods: z.array(z.string()).nullable().optional().describe('Shipping methods.'),
    date_created: z.string().optional().describe('Date created.')
});

const action = createAction({
    description: 'Update a coupon.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-coupon'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_marketing'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.type !== undefined && { type: input.type }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.code !== undefined && { code: input.code }),
            ...(input.applies_to !== undefined && { applies_to: input.applies_to }),
            ...(input.min_purchase !== undefined && { min_purchase: input.min_purchase }),
            ...(input.max_uses !== undefined && { max_uses: input.max_uses }),
            ...(input.max_uses_per_customer !== undefined && { max_uses_per_customer: input.max_uses_per_customer }),
            ...(input.enabled !== undefined && { enabled: input.enabled }),
            ...(input.expires !== undefined && { expires: input.expires }),
            ...(input.restricted_to !== undefined && { restricted_to: input.restricted_to }),
            ...(input.shipping_methods !== undefined && { shipping_methods: input.shipping_methods })
        };

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-content/marketing/coupons
            endpoint: `/v2/coupons/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const providerCoupon = ProviderCouponSchema.parse(response.data);

        return {
            id: providerCoupon.id,
            ...(providerCoupon.name !== undefined && { name: providerCoupon.name }),
            ...(providerCoupon.type !== undefined && { type: providerCoupon.type }),
            ...(providerCoupon.amount !== undefined && { amount: providerCoupon.amount }),
            ...(providerCoupon.min_purchase !== undefined && { min_purchase: providerCoupon.min_purchase }),
            ...(providerCoupon.expires !== undefined && { expires: providerCoupon.expires }),
            ...(providerCoupon.enabled !== undefined && { enabled: providerCoupon.enabled }),
            ...(providerCoupon.code !== undefined && { code: providerCoupon.code }),
            ...(providerCoupon.applies_to !== undefined && { applies_to: providerCoupon.applies_to }),
            ...(providerCoupon.num_uses !== undefined && { num_uses: providerCoupon.num_uses }),
            ...(providerCoupon.max_uses !== undefined && { max_uses: providerCoupon.max_uses }),
            ...(providerCoupon.max_uses_per_customer !== undefined && { max_uses_per_customer: providerCoupon.max_uses_per_customer }),
            ...(providerCoupon.restricted_to !== undefined && { restricted_to: providerCoupon.restricted_to }),
            ...(providerCoupon.shipping_methods !== undefined && { shipping_methods: providerCoupon.shipping_methods }),
            ...(providerCoupon.date_created !== undefined && { date_created: providerCoupon.date_created })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
