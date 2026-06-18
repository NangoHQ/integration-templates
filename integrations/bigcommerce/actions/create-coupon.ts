import { z } from 'zod';
import { createAction } from 'nango';

const CouponTypeSchema = z.enum(['per_item_discount', 'percentage_discount', 'per_total_discount', 'shipping_discount', 'free_shipping', 'promotion']);

const AppliesToSchema = z.object({
    entity: z.enum(['products', 'categories']).describe('What the discount applies to.'),
    ids: z.array(z.number()).describe('IDs of the products or categories.')
});

const InputSchema = z.object({
    name: z.string().describe('Coupon name. Must be unique.'),
    type: CouponTypeSchema.describe('Discount type.'),
    amount: z.string().describe('Discount amount or percentage as a string (e.g. "5.0000").'),
    code: z.string().describe('Coupon code. Must be unique.'),
    applies_to: AppliesToSchema,
    min_purchase: z.string().optional().describe('Minimum order value required as a string (e.g. "25.0000").'),
    expires: z.string().optional().describe('Expiration date in RFC 2822 format.'),
    enabled: z.boolean().optional().describe('Whether the coupon is enabled.'),
    max_uses: z.number().optional().describe('Maximum total uses.'),
    max_uses_per_customer: z.number().optional().describe('Maximum uses per customer.')
});

const ProviderCouponSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    amount: z.string(),
    min_purchase: z.string().optional(),
    expires: z.string().optional(),
    enabled: z.boolean().optional(),
    code: z.string(),
    applies_to: z.object({
        entity: z.string(),
        ids: z.array(z.number())
    }),
    max_uses: z.number().optional(),
    max_uses_per_customer: z.number().optional(),
    restricted_to: z.unknown().optional(),
    shipping_methods: z.array(z.string()).nullable().optional(),
    date_created: z.string().optional(),
    num_uses: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Coupon ID.'),
    name: z.string().describe('Coupon name.'),
    type: z.string().describe('Discount type.'),
    amount: z.string().describe('Discount amount.'),
    min_purchase: z.string().optional().describe('Minimum order value.'),
    expires: z.string().optional().describe('Expiration date.'),
    enabled: z.boolean().optional().describe('Whether enabled.'),
    code: z.string().describe('Coupon code.'),
    applies_to: z
        .object({
            entity: z.string().describe('Entity type.'),
            ids: z.array(z.number()).describe('Entity IDs.')
        })
        .describe('What the discount applies to.'),
    max_uses: z.number().optional().describe('Maximum total uses.'),
    max_uses_per_customer: z.number().optional().describe('Maximum uses per customer.'),
    restricted_to: z.unknown().optional().describe('Restriction object.'),
    shipping_methods: z.array(z.string()).nullable().optional().describe('Shipping methods.'),
    date_created: z.string().optional().describe('Date created.'),
    num_uses: z.number().optional().describe('Number of uses.')
});

const action = createAction({
    description: 'Create a coupon.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_marketing'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.bigcommerce.com/docs/rest-management/marketing/coupons#create-a-coupon
            endpoint: '/v2/coupons',
            data: {
                name: input.name,
                type: input.type,
                amount: input.amount,
                code: input.code,
                applies_to: input.applies_to,
                ...(input.min_purchase !== undefined && { min_purchase: input.min_purchase }),
                ...(input.expires !== undefined && { expires: input.expires }),
                ...(input.enabled !== undefined && { enabled: input.enabled }),
                ...(input.max_uses !== undefined && { max_uses: input.max_uses }),
                ...(input.max_uses_per_customer !== undefined && { max_uses_per_customer: input.max_uses_per_customer })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data from BigCommerce coupon creation.'
            });
        }

        const providerCoupon = ProviderCouponSchema.parse(response.data);

        return {
            id: providerCoupon.id,
            name: providerCoupon.name,
            type: providerCoupon.type,
            amount: providerCoupon.amount,
            ...(providerCoupon.min_purchase !== undefined && { min_purchase: providerCoupon.min_purchase }),
            ...(providerCoupon.expires !== undefined && { expires: providerCoupon.expires }),
            ...(providerCoupon.enabled !== undefined && { enabled: providerCoupon.enabled }),
            code: providerCoupon.code,
            applies_to: providerCoupon.applies_to,
            ...(providerCoupon.max_uses !== undefined && { max_uses: providerCoupon.max_uses }),
            ...(providerCoupon.max_uses_per_customer !== undefined && { max_uses_per_customer: providerCoupon.max_uses_per_customer }),
            ...(providerCoupon.restricted_to !== undefined && { restricted_to: providerCoupon.restricted_to }),
            ...(providerCoupon.shipping_methods !== undefined && { shipping_methods: providerCoupon.shipping_methods }),
            ...(providerCoupon.date_created !== undefined && { date_created: providerCoupon.date_created }),
            ...(providerCoupon.num_uses !== undefined && { num_uses: providerCoupon.num_uses })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
