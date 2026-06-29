import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Coupon ID. Example: 1')
});

const AppliesToSchema = z.object({
    entity: z.string().optional(),
    ids: z.array(z.number()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    amount: z.string(),
    code: z.string(),
    applies_to: AppliesToSchema,
    num_uses: z.number(),
    date_created: z.string(),
    min_purchase: z.string().optional(),
    expires: z.string().optional(),
    enabled: z.boolean().optional(),
    max_uses: z.number().optional(),
    max_uses_per_customer: z.number().optional(),
    restricted_to: z.object({}).passthrough().optional(),
    shipping_methods: z.array(z.string()).optional()
});

const RawCouponSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    amount: z.string(),
    code: z.string(),
    applies_to: AppliesToSchema,
    num_uses: z.number(),
    date_created: z.string(),
    min_purchase: z.string().optional(),
    expires: z.string().optional(),
    enabled: z.boolean().optional(),
    max_uses: z.number().optional(),
    max_uses_per_customer: z.number().optional(),
    restricted_to: z.unknown().optional(),
    shipping_methods: z.unknown().optional()
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
};

const action = createAction({
    description: 'Retrieve a coupon.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_marketing_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/marketing/coupons#get-a-coupon
            endpoint: `/v2/coupons/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Coupon with id ${input.id} not found.`,
                id: input.id
            });
        }

        const rawCoupon = RawCouponSchema.parse(response.data);

        return {
            id: rawCoupon.id,
            name: rawCoupon.name,
            type: rawCoupon.type,
            amount: rawCoupon.amount,
            code: rawCoupon.code,
            applies_to: rawCoupon.applies_to,
            num_uses: rawCoupon.num_uses,
            date_created: rawCoupon.date_created,
            ...(rawCoupon.min_purchase !== undefined && { min_purchase: rawCoupon.min_purchase }),
            ...(rawCoupon.expires !== undefined && { expires: rawCoupon.expires }),
            ...(rawCoupon.enabled !== undefined && { enabled: rawCoupon.enabled }),
            ...(rawCoupon.max_uses !== undefined && { max_uses: rawCoupon.max_uses }),
            ...(rawCoupon.max_uses_per_customer !== undefined && { max_uses_per_customer: rawCoupon.max_uses_per_customer }),
            ...(isPlainObject(rawCoupon.restricted_to) && { restricted_to: rawCoupon.restricted_to }),
            ...(isStringArray(rawCoupon.shipping_methods) && { shipping_methods: rawCoupon.shipping_methods })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
