// Shared helpers for Square list/search syncs that paginate with a checkpointed cursor and a
// checkpointed `updated_after` high-water mark (payments.ts, refunds.ts). Kept in one place so
// the two syncs can't drift apart on cursor-expiry detection or high-water-mark overlap
// semantics.

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Square's List Payments / List Payment Refunds cursors expire a few minutes after being
// issued. A cursor resumed from a checkpoint saved on a previous (failed, delayed, or
// long-running) run can therefore be rejected by Square as invalid/expired on the next
// scheduled run. Detect that specific failure so the sync can restart pagination from
// `updated_after` instead of failing forever on every subsequent run.
export function isExpiredCursorError(error: unknown): boolean {
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

// Square's data can become consistent with a short delay, so a record updated just before the
// max `updated_at` seen this run might not have been visible yet while querying. Keep a small
// safety overlap on the saved high-water mark so that record is asked for again next run
// instead of being skipped forever; re-saving it is safe since batchSave upserts by id.
const HIGH_WATER_MARK_OVERLAP_MS = 2 * 60 * 1000;

export function withOverlap(isoTimestamp: string): string {
    const asDate = new Date(isoTimestamp);
    if (Number.isNaN(asDate.getTime())) {
        return isoTimestamp;
    }
    return new Date(asDate.getTime() - HIGH_WATER_MARK_OVERLAP_MS).toISOString();
}
