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

const CouponPageSchema = z.object({
    data: z.array(CouponItemSchema),
    links: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const CodePageSchema = z.object({
    data: z.array(CouponCodeItemSchema),
    links: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    state: z.string()
});

const CheckpointStateSchema = z.object({
    coupon_cursor: z.string().optional(),
    pending_coupon_ids: z.array(z.string()).optional(),
    current_coupon_id: z.string().optional(),
    code_cursor: z.string().optional()
});

function extractCursor(nextLink: string | null | undefined): string | undefined {
    if (nextLink == null) {
        return undefined;
    }

    let url: URL;
    // @allowTryCatch Convert a malformed provider pagination link into an explicit sync failure.
    try {
        url = new URL(nextLink, 'https://a.klaviyo.com');
    } catch (error) {
        throw new Error(`Invalid Klaviyo pagination link: ${error instanceof Error ? error.message : String(error)}`);
    }

    const cursor = url.searchParams.get('page[cursor]');
    if (!cursor) {
        throw new Error('Klaviyo pagination link is missing page[cursor]');
    }

    return cursor;
}

const sync = createSync({
    description: 'Sync coupon codes.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CouponCode: CouponCodeSchema
    },
    scopes: ['coupon-codes:read', 'coupons:read'],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();

        let checkpointState: z.infer<typeof CheckpointStateSchema> | undefined;

        if (rawCheckpoint != null) {
            const parsed = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${parsed.error.message}`);
            }

            if (parsed.data.state) {
                let stateParsed: unknown;
                // @allowTryCatch JSON.parse may throw on corrupted checkpoint state
                try {
                    stateParsed = JSON.parse(parsed.data.state);
                } catch {
                    throw new Error('Failed to parse checkpoint state');
                }

                const validated = CheckpointStateSchema.safeParse(stateParsed);
                if (!validated.success) {
                    throw new Error(`Invalid checkpoint state: ${validated.error.message}`);
                }
                checkpointState = validated.data;
            }
        }

        let couponCursor = checkpointState?.coupon_cursor;
        let pendingCouponIds = checkpointState?.pending_coupon_ids ? [...checkpointState.pending_coupon_ids] : [];
        let currentCouponId = checkpointState?.current_coupon_id;
        let codeCursor = checkpointState?.code_cursor;

        await nango.trackDeletesStart('CouponCode');

        // Resume a coupon whose code pagination was in progress
        if (currentCouponId != null && codeCursor !== undefined) {
            await processCouponCodes(nango, currentCouponId, codeCursor, async (nextCodeCursor) => {
                await nango.saveCheckpoint({
                    state: JSON.stringify({
                        coupon_cursor: couponCursor,
                        pending_coupon_ids: pendingCouponIds,
                        current_coupon_id: currentCouponId,
                        code_cursor: nextCodeCursor
                    })
                });
            });
            pendingCouponIds = pendingCouponIds.filter((id) => id !== currentCouponId);
            currentCouponId = undefined;
            codeCursor = undefined;
        }

        // A finished coupon may still be present in the checkpoint if the run
        // crashed after the last code page was saved but before pendingCouponIds
        // was updated. Remove it so we do not re-process completed work.
        if (currentCouponId != null && codeCursor === undefined) {
            pendingCouponIds = pendingCouponIds.filter((id) => id !== currentCouponId);
            currentCouponId = undefined;
        }

        // Finish any coupons that were already fetched but not processed
        while (pendingCouponIds.length > 0) {
            const couponId = pendingCouponIds.shift();
            if (typeof couponId !== 'string') {
                continue;
            }
            await processCouponCodes(nango, couponId, undefined, async (nextCodeCursor) => {
                await nango.saveCheckpoint({
                    state: JSON.stringify({
                        coupon_cursor: couponCursor,
                        pending_coupon_ids: pendingCouponIds,
                        current_coupon_id: couponId,
                        code_cursor: nextCodeCursor
                    })
                });
            });
        }

        // Fetch remaining coupon pages
        while (true) {
            const couponParams: Record<string, string> = {
                'page[size]': '100'
            };
            if (couponCursor) {
                couponParams['page[cursor]'] = couponCursor;
            }

            // https://developers.klaviyo.com/en/reference/get_coupons
            const couponResponse = await nango.get({
                endpoint: '/api/coupons',
                params: couponParams,
                headers: { revision: '2026-04-15' },
                retries: 3
            });

            const parsedCoupons = CouponPageSchema.safeParse(couponResponse.data);
            if (!parsedCoupons.success) {
                throw new Error(`Failed to parse coupon page: ${parsedCoupons.error.message}`);
            }

            const couponIds = parsedCoupons.data.data.map((c) => c.id);
            const nextCouponCursor = extractCursor(parsedCoupons.data.links?.next);
            couponCursor = nextCouponCursor;
            pendingCouponIds = [...couponIds];

            while (pendingCouponIds.length > 0) {
                const couponId = pendingCouponIds.shift();
                if (typeof couponId !== 'string') {
                    continue;
                }
                await processCouponCodes(nango, couponId, undefined, async (nextCodeCursor) => {
                    await nango.saveCheckpoint({
                        state: JSON.stringify({
                            coupon_cursor: couponCursor,
                            pending_coupon_ids: pendingCouponIds,
                            current_coupon_id: couponId,
                            code_cursor: nextCodeCursor
                        })
                    });
                });
            }

            if (!nextCouponCursor) {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CouponCode');
    }
});

async function processCouponCodes(
    nango: any,
    couponId: string,
    startCursor: string | undefined,
    onCheckpoint: (nextCursor: string | undefined) => Promise<void>
) {
    let codeCursor: string | undefined = startCursor;

    while (true) {
        const codeParams: Record<string, string> = {
            filter: `equals(coupon.id,'${couponId}')`,
            'page[size]': '100'
        };
        if (codeCursor) {
            codeParams['page[cursor]'] = codeCursor;
        }

        // https://developers.klaviyo.com/en/reference/get_coupon_codes
        const codeResponse = await nango.get({
            endpoint: '/api/coupon-codes',
            params: codeParams,
            headers: { revision: '2026-04-15' },
            retries: 3
        });

        const parsedCodes = CodePageSchema.safeParse(codeResponse.data);
        if (!parsedCodes.success) {
            throw new Error(`Failed to parse coupon code page: ${parsedCodes.error.message}`);
        }

        const codes = parsedCodes.data.data.map((code) => ({
            id: code.id,
            ...(code.attributes?.unique_code != null && { unique_code: code.attributes.unique_code }),
            ...(code.attributes?.status != null && { status: code.attributes.status }),
            ...(code.attributes?.expires_at != null && { expires_at: code.attributes.expires_at }),
            ...(code.relationships?.coupon?.data?.id != null && { coupon_id: code.relationships.coupon.data.id })
        }));

        if (codes.length > 0) {
            await nango.batchSave(codes, 'CouponCode');
        }

        const nextCodeCursor = extractCursor(parsedCodes.data.links?.next);
        codeCursor = nextCodeCursor;

        await onCheckpoint(codeCursor);

        if (!nextCodeCursor) {
            break;
        }
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
