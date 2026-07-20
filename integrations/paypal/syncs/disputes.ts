import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Note: PayPal's dispute list response (dispute_info) does not include an `outcome`/`dispute_flow` field at
// all (those only ever appeared as always-undefined dead fields here); it does include buyer/seller response
// due dates, which are modeled below instead.
const DisputeSchema = z.object({
    id: z.string(),
    dispute_id: z.string(),
    create_time: z.string(),
    update_time: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    dispute_state: z.string().optional(),
    dispute_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    buyer_response_due_date: z.string().optional(),
    seller_response_due_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderDisputeSchema = z.object({
    dispute_id: z.string(),
    create_time: z.string(),
    update_time: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    dispute_state: z.string().optional(),
    dispute_amount: z
        .object({
            currency_code: z.string().optional(),
            value: z.string().optional()
        })
        .optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    buyer_response_due_date: z.string().optional(),
    seller_response_due_date: z.string().optional()
});

const sync = createSync({
    description: 'Sync disputes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Dispute: DisputeSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { updated_after: '' });
        if (!checkpointResult.success) {
            throw new Error('Invalid checkpoint: ' + checkpointResult.error.message);
        }
        const checkpoint = checkpointResult.data;

        // PayPal caps this endpoint at page 50 (page_size up to 50): a single query can only ever retrieve
        // 2,500 disputes. Results are sorted latest-to-earliest by *creation* time, not update_time, so tracking
        // the max update_time seen across a capped window (and restarting from it) does not guarantee forward
        // progress: a dispute with a smaller update_time can be sorted past page 50 and permanently missed.
        // Instead we bound each query with BOTH update_time_after and update_time_before, and adaptively shrink
        // the window whenever it's dense enough to hit the page cap, so every dispute in range is guaranteed to
        // fall within some window's page 1-50.
        const PAGE_SIZE = 50;
        const MAX_PAGE = 50;
        const MIN_WINDOW_MS = 60 * 1000; // 1 minute floor, to bound worst-case shrinking
        const OVERLAP_MS = 1000; // re-fetch 1s of overlap on each advance so boundary ties aren't dropped

        const DEFAULT_LOOKBACK_MS = 180 * 24 * 60 * 60 * 1000; // PayPal's own max lookback for this endpoint
        const now = Date.now();
        let windowStart = checkpoint.updated_after ? new Date(checkpoint.updated_after).getTime() : now - DEFAULT_LOOKBACK_MS;

        while (windowStart < now) {
            // Always attempt the entire remaining range first; only shrink (halve) if that's dense enough to hit
            // the page cap. This keeps a typical (low-volume) sync to a single window instead of crawling forward
            // in small fixed steps.
            let windowMs = now - windowStart;

            for (;;) {
                const windowEnd = windowStart + windowMs;

                const proxyConfig: ProxyConfiguration = {
                    // https://developer.paypal.com/api/customer-disputes/v1/#disputes_list
                    endpoint: '/v1/customer/disputes',
                    params: {
                        update_time_after: new Date(windowStart).toISOString(),
                        update_time_before: new Date(windowEnd).toISOString(),
                        page_size: PAGE_SIZE
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_calculation_method: 'per-page',
                        offset_start_value: 1,
                        limit_name_in_request: 'page_size',
                        limit: PAGE_SIZE,
                        response_path: 'items'
                    },
                    retries: 3
                };

                let pageNumber = 0;
                let hitPageCap = false;

                for await (const page of nango.paginate(proxyConfig)) {
                    if (!Array.isArray(page)) {
                        throw new Error('Expected page to be an array');
                    }
                    pageNumber++;

                    const disputes = page
                        .map((item) => {
                            const parsed = ProviderDisputeSchema.safeParse(item);
                            if (!parsed.success) {
                                throw new Error('Failed to parse dispute: ' + parsed.error.message);
                            }
                            return parsed.data;
                        })
                        .map((record) => ({
                            id: record.dispute_id,
                            dispute_id: record.dispute_id,
                            create_time: record.create_time,
                            update_time: record.update_time,
                            ...(record.reason != null && { reason: record.reason }),
                            ...(record.status != null && { status: record.status }),
                            ...(record.dispute_state != null && { dispute_state: record.dispute_state }),
                            ...(record.dispute_amount != null && {
                                dispute_amount: {
                                    ...(record.dispute_amount.currency_code != null && {
                                        currency_code: record.dispute_amount.currency_code
                                    }),
                                    ...(record.dispute_amount.value != null && {
                                        value: record.dispute_amount.value
                                    })
                                }
                            }),
                            ...(record.dispute_life_cycle_stage != null && {
                                dispute_life_cycle_stage: record.dispute_life_cycle_stage
                            }),
                            ...(record.dispute_channel != null && { dispute_channel: record.dispute_channel }),
                            ...(record.buyer_response_due_date != null && { buyer_response_due_date: record.buyer_response_due_date }),
                            ...(record.seller_response_due_date != null && { seller_response_due_date: record.seller_response_due_date })
                        }));

                    if (disputes.length > 0) {
                        await nango.batchSave(disputes, 'Dispute');
                    }

                    if (pageNumber >= MAX_PAGE && page.length === PAGE_SIZE) {
                        // A full page 50 means this window may hold more than 2,500 disputes; stop here and
                        // retry with a smaller window instead of requesting the unsupported page 51.
                        hitPageCap = true;
                        break;
                    }
                }

                if (hitPageCap && windowMs > MIN_WINDOW_MS) {
                    windowMs = Math.max(Math.floor(windowMs / 2), MIN_WINDOW_MS);
                    continue;
                }

                // Window complete (or shrunk to the floor and accepted as best-effort, which would require
                // >2,500 disputes updated within a single minute). If this window reached "now", we're caught up;
                // otherwise advance with a small overlap so disputes sharing the exact boundary timestamp are
                // re-fetched next time (safe since batchSave upserts by id) instead of subtracting overlap forever.
                windowStart = windowEnd >= now ? now : windowEnd - OVERLAP_MS;
                await nango.saveCheckpoint({ updated_after: new Date(windowStart).toISOString() });
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
