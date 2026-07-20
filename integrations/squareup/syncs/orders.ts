import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LocationSchema = z.object({
    id: z.string()
});

const LocationsResponseSchema = z.object({
    locations: z.array(LocationSchema).optional()
});

const OrderSchema = z
    .object({
        id: z.string(),
        location_id: z.string(),
        updated_at: z.string().optional()
    })
    .passthrough();

const SearchOrdersPageSchema = z.object({
    orders: z.array(z.unknown()).optional()
});

// Square's SearchOrders endpoint accepts at most 10 location_ids per request.
const LOCATION_BATCH_SIZE = 10;

// Square pagination cursors expire after a short window. If a run is interrupted (crash,
// timeout) and resumed later - either via retry or the next hourly run - after the cursor has
// expired, Square rejects it with an INVALID_CURSOR error, and the sync would otherwise fail
// forever on that same stale cursor. Detect that specific error so the current batch can be
// restarted from the beginning instead.
const ProviderHttpErrorSchema = z.object({
    response: z.object({
        data: z.object({
            errors: z.array(z.object({ code: z.string().optional() }).passthrough()).optional()
        })
    })
});

function isInvalidCursorError(error: unknown): boolean {
    const parsed = ProviderHttpErrorSchema.safeParse(error);
    if (!parsed.success) {
        return false;
    }
    return (parsed.data.response.data.errors ?? []).some((entry) => entry.code === 'INVALID_CURSOR');
}

// Stable signature of the current location ID list (order-independent) used to detect whether
// the merchant's locations changed while a multi-batch run was in progress. A saved numeric
// `location_batch_index` only identifies the same slice of location IDs if the underlying list
// is unchanged; if it changed, restart the in-progress run's batching from scratch with the new
// list rather than silently skipping locations that shifted into an already-completed batch.
function locationIdsSignature(locationIds: string[]): string {
    return JSON.stringify([...locationIds].sort());
}

// Checkpoint shape:
// - updated_after: the high-water mark to filter on for the NEXT full run. Only promoted once
//   every location batch has been fully enumerated for the current run.
// - run_started_at: the timestamp captured when the current (possibly still in-progress) run
//   began. Kept stable across retries/resumes of the same run so that it can be safely promoted
//   to `updated_after` once the run completes, regardless of how many resumes it took. Empty
//   string means "no run in progress" (i.e. the previous run completed cleanly).
// - location_batch_index: which chunk of (<=10) location IDs we're currently working through.
//   Lets a retry resume at the right batch instead of restarting all batches from scratch.
// - location_ids_signature: signature of the location ID list this run's batches were computed
//   from. Compared against the freshly fetched list on every execution to detect location
//   changes mid-run.
// - cursor: the pagination cursor to resume the CURRENT location batch from. Empty string means
//   "start this batch from the beginning".
const CheckpointSchema = z.object({
    updated_after: z.string(),
    run_started_at: z.string(),
    location_batch_index: z.number().int(),
    location_ids_signature: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const updatedAfter = rawCheckpoint?.updated_after || '';
        // Reuse the previously captured run start time when resuming a run that's already in
        // progress, so the eventual high-water mark reflects when THIS run began, not when a
        // later resume happened to execute.
        const runStartedAt = rawCheckpoint?.run_started_at || new Date().toISOString();
        let locationBatchIndex = rawCheckpoint?.location_batch_index ?? 0;
        let cursor = rawCheckpoint?.cursor || '';
        const previousLocationIdsSignature = rawCheckpoint?.location_ids_signature || '';

        // https://developer.squareup.com/reference/square/locations-api/list-locations
        const locationsResponse = await nango.get({
            endpoint: '/v2/locations',
            retries: 3
        });

        const parsedLocations = LocationsResponseSchema.safeParse(locationsResponse.data);
        if (!parsedLocations.success) {
            throw new Error('Failed to parse locations response');
        }

        const locationIds = parsedLocations.data.locations?.map((location) => location.id) ?? [];
        if (locationIds.length === 0) {
            return;
        }

        const locationIdsSignatureValue = locationIdsSignature(locationIds);

        // If a run was already in progress and the location list has changed since it started
        // (locations added/removed), a saved numeric batch index no longer identifies the same
        // location IDs. Restart this run's batching from scratch with the current list rather
        // than risk skipping locations that shifted position - re-fetching already-synced
        // batches is harmless since batchSave upserts by id.
        if (previousLocationIdsSignature && previousLocationIdsSignature !== locationIdsSignatureValue) {
            locationBatchIndex = 0;
            cursor = '';
        }

        const locationBatches: string[][] = [];
        for (let i = 0; i < locationIds.length; i += LOCATION_BATCH_SIZE) {
            locationBatches.push(locationIds.slice(i, i + LOCATION_BATCH_SIZE));
        }

        // Guard against a stale checkpoint pointing past the current number of batches (e.g. the
        // merchant removed locations since the last run). Restart batching from the top rather
        // than skipping the whole sync.
        if (locationBatchIndex >= locationBatches.length) {
            locationBatchIndex = 0;
            cursor = '';
        }

        for (; locationBatchIndex < locationBatches.length; locationBatchIndex++) {
            const currentBatchIndex = locationBatchIndex;
            const currentBatchLocationIds = locationBatches[currentBatchIndex]!;

            const runBatchPagination = async (startCursor: string) => {
                cursor = startCursor;

                const proxyConfig: ProxyConfiguration = {
                    // https://developer.squareup.com/reference/square/orders-api/search-orders
                    endpoint: '/v2/orders/search',
                    method: 'POST',
                    data: {
                        location_ids: currentBatchLocationIds,
                        ...(startCursor && { cursor: startCursor }),
                        query: {
                            sort: {
                                sort_field: 'UPDATED_AT',
                                sort_order: 'ASC'
                            },
                            ...(updatedAfter && {
                                filter: {
                                    date_time_filter: {
                                        updated_at: {
                                            start_at: updatedAfter
                                        }
                                    }
                                }
                            })
                        },
                        limit: 100
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'cursor',
                        cursor_path_in_response: 'cursor',
                        response_path: 'orders',
                        limit_name_in_request: 'limit',
                        limit: 100,
                        // IMPORTANT: `on_page` fires AFTER a page has been yielded to the `for await`
                        // loop below, but BEFORE the next page is fetched - i.e. it runs one step
                        // "ahead" relative to the loop body's processing of that same page. Doing the
                        // batchSave + checkpoint bookkeeping directly in `for await` (using a `cursor`
                        // variable updated by `on_page`) would therefore always be reading last
                        // page's cursor - which is exactly what caused the pre-existing checkpoint bug
                        // (the wrong/stale cursor gets persisted, so a resumed run either re-fetches a
                        // page it already processed or never reaches the "pagination complete" state).
                        // To avoid that lag entirely, do the real work HERE, where `response` (and the
                        // freshly computed `nextPageParam`) unambiguously correspond to the SAME page.
                        on_page: async ({ nextPageParam, response }) => {
                            const parsedPage = SearchOrdersPageSchema.safeParse(response.data);
                            if (!parsedPage.success) {
                                throw new Error('Failed to parse orders search response');
                            }

                            const orders = (parsedPage.data.orders ?? []).map((item) => {
                                const parsed = OrderSchema.safeParse(item);
                                if (!parsed.success) {
                                    throw new Error('Failed to parse order');
                                }
                                return parsed.data;
                            });

                            if (orders.length > 0) {
                                await nango.batchSave(orders, 'Order');
                            }

                            cursor = typeof nextPageParam === 'string' ? nextPageParam : '';

                            // Mid-batch (or batch-just-completed) checkpoint: persists the cursor
                            // needed to resume this batch, or - once the batch has no more pages -
                            // advances location_batch_index and clears the cursor so a resume moves
                            // on to the next batch instead of restarting this one.
                            await nango.saveCheckpoint({
                                updated_after: updatedAfter,
                                run_started_at: runStartedAt,
                                location_batch_index: cursor ? currentBatchIndex : currentBatchIndex + 1,
                                location_ids_signature: locationIdsSignatureValue,
                                cursor
                            });
                        }
                    },
                    retries: 3
                };

                // Drain the generator to completion; all per-page work happens in `on_page` above.
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _page of nango.paginate(proxyConfig)) {
                    // no-op
                }
            };

            // @allowTryCatch A previously-valid cursor can expire (or otherwise become invalid)
            // between runs. Recover once by restarting this location batch from the beginning
            // instead of failing forever with the same stale cursor saved in the checkpoint.
            try {
                await runBatchPagination(cursor);
            } catch (err) {
                if (isInvalidCursorError(err)) {
                    await nango.log('Square orders search cursor expired or invalid; restarting this location batch from the beginning.');
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter,
                        run_started_at: runStartedAt,
                        location_batch_index: currentBatchIndex,
                        location_ids_signature: locationIdsSignatureValue,
                        cursor: ''
                    });
                    await runBatchPagination('');
                } else {
                    throw err;
                }
            }

            // Defensive final save for this batch: guarantees the batch is marked complete even
            // in the edge case where the very last page of results comes back empty (Square's
            // pagination generator stops without invoking `on_page` again in that case).
            cursor = '';
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                run_started_at: runStartedAt,
                location_batch_index: currentBatchIndex + 1,
                location_ids_signature: locationIdsSignatureValue,
                cursor: ''
            });
        }

        // Every location batch has been fully enumerated for this run: promote run_started_at to
        // the new high-water mark and clear all in-progress-run state so the next execution
        // starts a fresh run from batch 0.
        await nango.saveCheckpoint({
            updated_after: runStartedAt,
            run_started_at: '',
            location_batch_index: 0,
            location_ids_signature: '',
            cursor: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
