import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CouponSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({}).passthrough()
});

const ResponseSchema = z.object({
    data: z.array(CouponSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional(),
            self: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    coupons: z.array(CouponSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List coupons.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['coupons:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            'page[size]': '100'
        };

        if (input.cursor) {
            params['page[cursor]'] = input.cursor;
        }

        // https://developers.klaviyo.com/en/reference/get_coupons
        const response = await nango.get({
            endpoint: '/api/coupons',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed.links?.next) {
            const url = new URL(parsed.links.next);
            const cursor = url.searchParams.get('page[cursor]');
            if (cursor) {
                nextCursor = cursor;
            }
        }

        return {
            coupons: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
