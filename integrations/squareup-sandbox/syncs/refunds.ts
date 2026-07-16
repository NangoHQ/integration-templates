import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const RefundSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount_money: MoneySchema.optional(),
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    location_id: z.string().optional(),
    reason: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

// Square's List Payment Refunds cursors expire a few minutes after being issued. A cursor
// resumed from a checkpoint saved on a previous (failed, delayed, or long-running) run can
// therefore be rejected by Square as invalid/expired on the next scheduled run. Detect that
// specific failure so we can restart pagination from `updated_after` instead of failing
// forever on every subsequent run.
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isExpiredCursorError(error: unknown): boolean {
    if (!isRecord(error)) {
        return false;
    }
    const httpResponse = isRecord(error['response']) ? error['response'] : undefined;
    const status = typeof httpResponse?.['status'] === 'number' ? httpResponse['status'] : error['status'];
    if (status !== 400) {
        return false;
    }
    const message = JSON.stringify(httpResponse?.['data'] ?? '').toLowerCase();
    return message.includes('cursor');
}

// Square's data can become consistent with a short delay, so a refund updated just before the
// max `updated_at` we saw this run might not have been visible yet while we were querying.
// Keep a small safety overlap on the saved high-water mark so that refund is asked for again
// next run instead of being skipped forever; re-saving it is safe since batchSave upserts by id.
const HIGH_WATER_MARK_OVERLAP_MS = 2 * 60 * 1000;

function withOverlap(isoTimestamp: string): string {
    const asDate = new Date(isoTimestamp);
    if (Number.isNaN(asDate.getTime())) {
        return isoTimestamp;
    }
    return new Date(asDate.getTime() - HIGH_WATER_MARK_OVERLAP_MS).toISOString();
}

const sync = createSync({
    description: 'Sync refunds.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Refund: RefundSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || '1970-01-01T00:00:00.000Z';
        let lastProcessedUpdatedAt = updatedAfter;

        const runPagination = async (startCursor: string | undefined): Promise<void> => {
            let cursor = startCursor;

            const proxyConfig: ProxyConfiguration = {
                // https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds
                endpoint: '/v2/refunds',
                params: {
                    updated_at_begin_time: updatedAfter,
                    sort_order: 'ASC',
                    sort_field: 'UPDATED_AT',
                    ...(cursor && { cursor })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'cursor',
                    response_path: 'refunds',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async (paginationState) => {
                        cursor = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const refunds of nango.paginate(proxyConfig)) {
                const validRefunds = z.array(RefundSchema).safeParse(refunds);
                if (!validRefunds.success) {
                    throw new Error(`Invalid refund data: ${validRefunds.error.message}`);
                }

                if (validRefunds.data.length > 0) {
                    await nango.batchSave(validRefunds.data, 'Refund');

                    const lastRefund = validRefunds.data[validRefunds.data.length - 1];
                    if (lastRefund) {
                        lastProcessedUpdatedAt = lastRefund.updated_at ?? lastRefund.created_at ?? lastProcessedUpdatedAt;
                    }
                }

                if (cursor) {
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter,
                        cursor
                    });
                }
            }
        };

        // @allowTryCatch: an expired/invalid pagination cursor from a stale checkpoint must be
        // caught here so we can drop it and restart from `updated_after` instead of failing this
        // (and every future) run. Any other error is re-thrown unchanged.
        try {
            await runPagination(checkpoint.cursor || undefined);
        } catch (error) {
            if (!isExpiredCursorError(error)) {
                throw error;
            }
            // Drop the stale cursor and restart this run from the last known-good
            // updated_after instead of getting stuck on it forever.
            lastProcessedUpdatedAt = updatedAfter;
            await runPagination(undefined);
        }

        // Only slide the high-water mark back when this run actually advanced it - otherwise
        // repeatedly subtracting the overlap on an unchanged checkpoint would make the query
        // window grow without bound across empty runs.
        const nextUpdatedAfter = lastProcessedUpdatedAt === updatedAfter ? updatedAfter : withOverlap(lastProcessedUpdatedAt);

        await nango.saveCheckpoint({ updated_after: nextUpdatedAfter, cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
