import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    coupon_id: z.string().optional().describe('Filter by coupon id linked to coupon set. Example: "sample_coupon"'),
    name: z.string().optional().describe('Filter by coupon set name. Example: "Weekend Offer"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of resources to return. Min 1, max 100. Defaults to 10.')
});

const CouponSetSchema = z.object({
    id: z.string(),
    coupon_id: z.string(),
    name: z.string(),
    total_count: z.number().optional(),
    redeemed_count: z.number().optional(),
    archived_count: z.number().optional(),
    meta_data: z.record(z.string(), z.unknown()).optional(),
    object: z.string().optional()
});

const OutputSchema = z.object({
    coupon_sets: z.array(CouponSetSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List coupon sets (Product Catalog 2.0).',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-coupon-sets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/coupon_sets/list-coupon-sets
            endpoint: '/api/v2/coupon_sets',
            params: {
                ...(input.coupon_id !== undefined && { 'coupon_id[is]': input.coupon_id }),
                ...(input.name !== undefined && { 'name[is]': input.name }),
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const listResponse = z
            .object({
                list: z.array(
                    z.object({
                        coupon_set: z.object({}).passthrough()
                    })
                ),
                next_offset: z.string().optional()
            })
            .parse(response.data);

        const couponSets = listResponse.list.map((item) => {
            const parsed = CouponSetSchema.parse(item.coupon_set);
            return parsed;
        });

        return {
            coupon_sets: couponSets,
            ...(listResponse.next_offset !== undefined && { next_offset: listResponse.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
