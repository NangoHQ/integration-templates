import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    external_id: z
        .string()
        .regex(/^[0-9_A-Za-z]+$/, { message: 'external_id must contain only letters, digits, and underscores' })
        .describe('Unique coupon identifier. Example: "nango_seed_coupon_1"'),
    description: z.string().optional().describe('Human-readable description of the coupon.')
});

const ProviderCouponSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            external_id: z.string(),
            description: z.string().optional()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    external_id: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create a coupon.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['coupons:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/create_coupon
            endpoint: '/api/coupons',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'coupon',
                    attributes: {
                        external_id: input.external_id,
                        ...(input.description !== undefined && { description: input.description })
                    }
                }
            },
            retries: 10
        });

        const providerCoupon = ProviderCouponSchema.parse(response.data);

        return {
            id: providerCoupon.data.id,
            external_id: providerCoupon.data.attributes.external_id,
            ...(providerCoupon.data.attributes.description !== undefined && {
                description: providerCoupon.data.attributes.description
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
