import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogObjectSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        updated_at: z.string(),
        is_deleted: z.boolean().optional()
    })
    .passthrough();

const SearchCatalogObjectsResponseSchema = z.object({
    objects: z.array(CatalogObjectSchema).optional(),
    cursor: z.string().optional(),
    errors: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

// Square cursors are only valid for a limited time (generally ~5 minutes). If a run is delayed
// or slow, a previously-saved cursor can expire, and Square responds with a 400
// INVALID_REQUEST_ERROR / INVALID_CURSOR error. Without recovery, that failure would repeat on
// every subsequent run (the checkpoint keeps pointing at the same dead cursor), permanently
// stalling the sync. This schema lets us structurally narrow a caught `unknown` error to check for
// that specific condition, matching the pattern used elsewhere in this codebase for inspecting
// thrown proxy errors.
const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z
                .object({
                    errors: z
                        .array(
                            z
                                .object({
                                    code: z.string().optional(),
                                    field: z.string().optional()
                                })
                                .passthrough()
                        )
                        .optional()
                })
                .passthrough()
                .optional()
        })
        .passthrough()
        .optional()
});

function isExpiredOrInvalidCursorError(error: unknown): boolean {
    const parsed = ProxyErrorSchema.safeParse(error);
    if (!parsed.success) {
        return false;
    }

    const status = parsed.data.response?.status;
    const errors = parsed.data.response?.data?.errors ?? [];

    return status === 400 && errors.some((e) => e.code === 'INVALID_CURSOR' || e.field === 'cursor');
}

// Save the checkpoint slightly behind the true max observed updated_at so that objects updated
// at (or a moment after) the exact high-water-mark timestamp - e.g. a near-simultaneous bulk
// update racing with this sync run - aren't permanently skipped on the next run. Square's
// begin_time filter is exclusive, so without this buffer any object sharing the exact max
// timestamp but not yet visible at query time would never be re-fetched. batchSave upserts by id,
// so re-fetching a few already-synced objects is harmless.
const HIGH_WATER_MARK_OVERLAP_MS = 2000;

function applyOverlapBuffer(timestamp: string): string {
    const parsedTime = new Date(timestamp).getTime();
    if (Number.isNaN(parsedTime)) {
        return timestamp;
    }
    return new Date(parsedTime - HIGH_WATER_MARK_OVERLAP_MS).toISOString();
}

const sync = createSync({
    description: 'Sync catalog objects',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CatalogObject: CatalogObjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || '';
        let cursor = checkpoint?.cursor || '';
        let maxUpdatedAt = '';
        let cursorRecoveryAttempted = false;

        while (true) {
            const config: ProxyConfiguration = {
                // https://developer.squareup.com/reference/square/catalog-api/search-catalog-objects
                endpoint: '/v2/catalog/search',
                method: 'POST',
                data: {
                    object_types: [
                        'ITEM',
                        'CATEGORY',
                        'TAX',
                        'DISCOUNT',
                        'MODIFIER_LIST',
                        'PRICING_RULE',
                        'PRODUCT_SET',
                        'TIME_PERIOD',
                        'MEASUREMENT_UNIT',
                        'SUBSCRIPTION_PLAN',
                        'ITEM_OPTION',
                        'CUSTOM_ATTRIBUTE_DEFINITION',
                        'IMAGE',
                        'ITEM_OPTION_VAL',
                        'ITEM_VARIATION',
                        'MODIFIER'
                    ],
                    include_deleted_objects: true,
                    limit: 100,
                    ...(updatedAfter && { begin_time: updatedAfter }),
                    ...(cursor && { cursor })
                },
                retries: 3
            };

            let response;
            // @allowTryCatch A previously-valid cursor can expire (or otherwise become invalid)
            // between runs. Recover once by dropping the cursor and resuming from the last
            // high-water mark, instead of failing forever with the same stale cursor saved in
            // the checkpoint.
            try {
                response = await nango.post(config);
            } catch (error) {
                if (cursor && !cursorRecoveryAttempted && isExpiredOrInvalidCursorError(error)) {
                    cursorRecoveryAttempted = true;
                    cursor = '';
                    await nango.saveCheckpoint({ updated_after: updatedAfter, cursor: '' });
                    continue;
                }
                throw error;
            }

            const parsed = SearchCatalogObjectsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse catalog search response: ${parsed.error.message}`);
            }

            const objects = parsed.data.objects ?? [];
            const nextCursor = parsed.data.cursor;

            if (objects.length === 0) {
                break;
            }

            const upserts = objects.filter((obj) => !obj.is_deleted);
            const deletions = objects.filter((obj) => obj.is_deleted).map((obj) => ({ id: obj.id }));

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'CatalogObject');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'CatalogObject');
            }

            for (const obj of objects) {
                if (obj.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = obj.updated_at;
                }
            }

            if (nextCursor) {
                cursor = nextCursor;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor: nextCursor
                });
            } else {
                await nango.saveCheckpoint({
                    updated_after: applyOverlapBuffer(maxUpdatedAt),
                    cursor: ''
                });
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
