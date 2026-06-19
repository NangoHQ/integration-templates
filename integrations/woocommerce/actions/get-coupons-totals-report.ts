import { z } from 'zod';
import { createAction } from 'nango';

const CouponTotalSchema = z.object({
    slug: z.string().describe('An alphanumeric identifier for the coupon type. Example: "percent"'),
    name: z.string().describe('Coupon type name. Example: "Percentage discount"'),
    total: z.number().describe('Amount of coupons for this type.')
});

const OutputSchema = z.object({
    totals: z.array(CouponTotalSchema)
});

const action = createAction({
    description: 'Retrieve the coupons totals report from WooCommerce.',
    version: '1.0.1',
    input: z.object({}),
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-coupons-totals
            endpoint: '/wp-json/wc/v3/reports/coupons/totals',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array response from the WooCommerce coupons totals endpoint.'
            });
        }

        const totals = response.data.map((item: unknown) => {
            const parsed = CouponTotalSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse a coupons totals item.',
                    details: parsed.error.format()
                });
            }
            return parsed.data;
        });

        return { totals };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
