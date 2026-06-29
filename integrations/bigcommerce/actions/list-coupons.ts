import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Pass the `next_cursor` value to fetch the next page.'),
    limit: z.number().int().min(1).max(250).optional().describe('Number of results per page. Default: 50.')
});

const CouponSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        type: z.string(),
        amount: z.string(),
        min_purchase: z.string().optional(),
        expires: z.string().optional(),
        enabled: z.boolean(),
        code: z.string(),
        applies_to: z.union([z.object({ entity: z.string(), ids: z.array(z.number()) }), z.record(z.string(), z.unknown())]).optional(),
        num_uses: z.number().optional(),
        max_uses: z.number().optional(),
        max_uses_per_customer: z.number().optional(),
        restricted_to: z
            .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
            .optional()
            .nullable(),
        shipping_methods: z.array(z.string()).optional().nullable(),
        date_created: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CouponSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List coupons.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-coupons'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_marketing_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedPage = input.cursor ? Number(input.cursor) : 1;
        if (input.cursor && (!Number.isInteger(parsedPage) || parsedPage < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }
        const page = parsedPage;
        const limit = input.limit ?? 50;

        // https://developer.bigcommerce.com/docs/rest-management/marketing/coupons
        const response = await nango.get({
            endpoint: '/v2/coupons',
            params: {
                page: String(page),
                limit: String(limit)
            },
            retries: 3
        });

        if (response.status === 204) {
            return {
                items: []
            };
        }

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of coupons from the provider.'
            });
        }

        const items = rawData.map((item: unknown) => {
            const parsed = CouponSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse coupon response.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const next_cursor = items.length === limit ? String(page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
