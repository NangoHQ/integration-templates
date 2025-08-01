/**
 * Calculates date ranges for incremental syncs with Workday, using overlapping windows
 * to avoid missing changes due to Workday's lag in emitting updates.
 *
 * Workday changes may take up to ~1 hour to appear in the API. To prevent missed updates:
 * - The upper bound (updatedThrough) is set to 1 hour in the past, so we only query data
 *   that Workday has reliably indexed.
 * - The lower bound (updatedFrom) is set to the lastSyncDate minus 1 hour, creating an
 *   overlap with the previous window. This ensures that if Workday delayed some records,
 *   they are re-fetched in the next sync.
 *
 * This means some duplicate records will be returned, but those can be safely deduplicated
 * downstream (e.g., by Worker ID + Effective Date).
 *
 * @param lastSyncDate - The timestamp of the last successful sync, as string or Date
 * @param lagMinutes - Number of minutes to lag for Workday delays (default: 60)
 * @returns Object containing:
 *   - updatedFrom: ISO string of range start (lastSyncDate - lag), or empty if no valid lastSyncDate
 *   - updatedThrough: ISO string of range end (now - lag)
 */
export function getIncrementalDateRange(lastSyncDate: string | Date, lagMinutes: number = 60): { updatedFrom: string; updatedThrough: string } {
    const LAG_MS = lagMinutes * 60 * 1000;

    // Upper bound safely behind current time
    const updatedThroughDate = new Date(Date.now() - LAG_MS);
    const updatedThrough = updatedThroughDate.toISOString();

    let updatedFrom = '';
    if (lastSyncDate) {
        const lastSync = new Date(lastSyncDate);
        if (!isNaN(lastSync.getTime())) {
            // Back off the from-date by lag to create overlap
            const overlappedFrom = lastSync.getTime() - LAG_MS;
            const safeFrom = Math.min(overlappedFrom, updatedThroughDate.getTime());
            updatedFrom = new Date(safeFrom).toISOString();
        }
    }

    return { updatedFrom, updatedThrough };
}
