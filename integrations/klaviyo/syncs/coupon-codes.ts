import { createSync } from 'nango';
import { z } from 'zod';

const CouponCodeSchema = z.object({
    id: z.string(),
    unique_code: z.string().optional(),
    status: z.string().optional(),
    expires_at: z.string().optional(),
    coupon_id: z.string().optional()
});

const CouponItemSchema = z.object({
    id: z.string()
});

const CouponCodeItemSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            unique_code: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            expires_at: z.string().nullable().optional()
        })
        .optional(),
    relationships: z
        .object({
            coupon: z
                .object({
                    data: z
                        .object({
                            id: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync coupon codes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CouponCode: CouponCodeSchema
    },
    scopes: ['coupon-codes:read', 'coupons:read'],

    exec: async (nango) => {
        await nango.trackDeletesStart('CouponCode');

        const coupons: Array<z.infer<typeof CouponItemSchema>> = [];

        // https://developers.klaviyo.com/en/reference/get_coupons
        for await (const couponPage of nango.paginate({
            endpoint: '/api/coupons',
            headers: { revision: '2026-04-15' },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        })) {
            const parsed = z.array(CouponItemSchema).safeParse(couponPage);
            if (!parsed.success) {
                throw new Error(`Failed to parse coupon page: ${parsed.error.message}`);
            }
            coupons.push(...parsed.data);
        }

        for (const coupon of coupons) {
            // https://developers.klaviyo.com/en/reference/get_coupon_codes
            for await (const codePage of nango.paginate({
                endpoint: '/api/coupon-codes',
                headers: { revision: '2026-04-15' },
                params: {
                    filter: `equals(coupon.id,'${coupon.id}')`
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'links.next',
                    response_path: 'data',
                    limit_name_in_request: 'page[size]',
                    limit: 100
                },
                retries: 3
            })) {
                const parsed = z.array(CouponCodeItemSchema).safeParse(codePage);
                if (!parsed.success) {
                    throw new Error(`Failed to parse coupon code page: ${parsed.error.message}`);
                }

                const codes = parsed.data.map((code) => ({
                    id: code.id,
                    ...(code.attributes?.unique_code != null && { unique_code: code.attributes.unique_code }),
                    ...(code.attributes?.status != null && { status: code.attributes.status }),
                    ...(code.attributes?.expires_at != null && { expires_at: code.attributes.expires_at }),
                    ...(code.relationships?.coupon?.data?.id != null && { coupon_id: code.relationships.coupon.data.id })
                }));

                if (codes.length > 0) {
                    await nango.batchSave(codes, 'CouponCode');
                }
            }
        }

        await nango.trackDeletesEnd('CouponCode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
