import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe("Pagination cursor from the previous response. Maps to Stripe's starting_after. Omit for the first page."),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 10.'),
    created_after: z.number().int().optional().describe('Only return coupons that were created after this Unix timestamp. Maps to created[gte].'),
    created_before: z.number().int().optional().describe('Only return coupons that were created before this Unix timestamp. Maps to created[lte].')
});

const CouponSchema = z
    .object({
        id: z.string(),
        object: z.literal('coupon'),
        amount_off: z.number().nullable().optional(),
        created: z.number(),
        currency: z.string().nullable().optional(),
        duration: z.string(),
        duration_in_months: z.number().nullable().optional(),
        livemode: z.boolean().optional(),
        max_redemptions: z.number().nullable().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        name: z.string().nullable().optional(),
        percent_off: z.number().nullable().optional(),
        redeem_by: z.number().nullable().optional(),
        times_redeemed: z.number().optional(),
        valid: z.boolean()
    })
    .passthrough();

const ListResponseSchema = z.object({
    object: z.literal('list'),
    url: z.string().optional(),
    has_more: z.boolean(),
    data: z.array(CouponSchema)
});

const OutputSchema = z.object({
    items: z.array(CouponSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List coupons from Stripe.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['starting_after'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.created_after !== undefined) {
            params['created[gte]'] = input.created_after;
        }
        if (input.created_before !== undefined) {
            params['created[lte]'] = input.created_before;
        }

        // https://docs.stripe.com/api/coupons/list
        const response = await nango.get({
            endpoint: '/v1/coupons',
            params,
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.data;
        const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
        const nextCursor = listResponse.has_more && lastItem !== undefined ? lastItem.id : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
