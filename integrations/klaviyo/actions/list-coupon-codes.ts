import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    coupon_id: z.string().optional().describe('Coupon ID to filter by. Example: "nango_seed_coupon_1"'),
    profile_id: z.string().optional().describe('Profile ID to filter by. Example: "01KWFX4MZPQDSD3YG79C83CBDV"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().min(1).max(100).optional().describe('Number of results per page. Default: 100, Max: 100.')
});

const CouponCodeSchema = z.object({
    id: z.string(),
    unique_code: z.string().optional(),
    status: z.string().optional(),
    expires_at: z.string().optional(),
    coupon_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CouponCodeSchema),
    next_cursor: z.string().optional()
});

const RawCouponCodeSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const RawResponseSchema = z.object({
    data: z.array(z.unknown()),
    links: z.record(z.string(), z.unknown()).optional()
});

const CouponRelDataSchema = z
    .object({
        data: z
            .object({
                id: z.string().optional()
            })
            .optional()
    })
    .optional();

const AttributesSchema = z
    .object({
        unique_code: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        expires_at: z.string().nullable().optional()
    })
    .optional();

const action = createAction({
    description: 'List coupon codes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['coupon-codes:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.coupon_id && !input.profile_id) {
            throw new nango.ActionError({
                type: 'missing_required_filter',
                message: 'Either coupon_id or profile_id must be provided.'
            });
        }

        const filterParts = [];
        if (input.coupon_id) {
            filterParts.push(`equals(coupon.id,'${input.coupon_id.replace(/'/g, "\\'")}')`);
        }
        if (input.profile_id) {
            filterParts.push(`equals(profile.id,'${input.profile_id.replace(/'/g, "\\'")}')`);
        }
        const filter = filterParts.join(',');

        const params: Record<string, string> = {
            filter: filter
        };
        if (input.cursor) {
            params['page[cursor]'] = input.cursor;
        }
        if (input.page_size) {
            params['page[size]'] = String(input.page_size);
        }

        // https://developers.klaviyo.com/en/reference/get_coupon_codes
        const response = await nango.get({
            endpoint: '/api/coupon-codes',
            params: params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsedResponse = RawResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from Klaviyo API.'
            });
        }

        const items = parsedResponse.data.data
            .map((item) => {
                const parsedItem = RawCouponCodeSchema.safeParse(item);
                if (!parsedItem.success) {
                    return null;
                }

                const attributes = parsedItem.data.attributes || {};
                const relationships = parsedItem.data.relationships || {};

                let couponId: string | undefined;
                const couponRelRaw = relationships['coupon'];
                const couponRel = CouponRelDataSchema.safeParse(couponRelRaw);
                if (couponRel.success) {
                    couponId = couponRel.data?.data?.id;
                }

                const parsedAttrs = AttributesSchema.safeParse(attributes);
                const uniqueCode = parsedAttrs.success ? parsedAttrs.data?.unique_code : undefined;
                const status = parsedAttrs.success ? parsedAttrs.data?.status : undefined;
                const expiresAt = parsedAttrs.success ? parsedAttrs.data?.expires_at : undefined;

                return {
                    id: parsedItem.data.id,
                    ...(typeof uniqueCode === 'string' && { unique_code: uniqueCode }),
                    ...(typeof status === 'string' && { status: status }),
                    ...(typeof expiresAt === 'string' && { expires_at: expiresAt }),
                    ...(couponId !== undefined && { coupon_id: couponId })
                };
            })
            .filter((item) => item !== null);

        const links = parsedResponse.data.links || {};
        const next = links['next'];
        let nextCursor: string | undefined;
        if (typeof next === 'string') {
            // @allowTryCatch: URL constructor may throw on malformed pagination links
            try {
                const url = new URL(next);
                const cursor = url.searchParams.get('page[cursor]');
                if (cursor) {
                    nextCursor = cursor;
                }
            } catch {
                // ignore invalid URL
            }
        }

        return {
            items: items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
