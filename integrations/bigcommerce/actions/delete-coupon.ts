import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    coupon_id: z.number().describe('Coupon ID. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean(),
    coupon_id: z.number()
});

const action = createAction({
    description: 'Delete a coupon.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/delete-coupon',
        method: 'POST'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_marketing'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.bigcommerce.com/docs/rest-management/marketing/coupons#delete-a-coupon
        const response = await nango.delete({
            endpoint: `/v2/coupons/${encodeURIComponent(String(input.coupon_id))}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Coupon not found',
                coupon_id: input.coupon_id
            });
        }

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_error',
                message: `Unexpected status code ${response.status} from BigCommerce API`,
                coupon_id: input.coupon_id
            });
        }

        return {
            success: true,
            coupon_id: input.coupon_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
