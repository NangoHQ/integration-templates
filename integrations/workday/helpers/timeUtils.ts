/**
 * Calculates a date range for incremental syncs with Workday.
 *
 * This function takes a last sync date and returns a date range that:
 * - Has an upper bound (updatedThrough) that is 10 minutes in the past to always be less than the current time
 * - Has a lower bound (updatedFrom) that is either:
 *   - Empty string if no valid lastSyncDate is provided
 *   - The earlier of lastSyncDate or updatedThrough to ensure valid range
 *
 * @param lastSyncDate - The timestamp of the last successful sync, as string or Date
 * @returns Object containing:
 *   - updatedFrom: ISO string of range start, or empty if no valid lastSyncDate
 *   - updatedThrough: ISO string of range end (10 mins ago)
 */
export function getIncrementalDateRange(lastSyncDate: string | Date): { updatedFrom: string; updatedThrough: string } {
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    // Calculate a "safe" upper bound that is guaranteed to be in the past
    const updatedThrough = new Date(Date.now() - TEN_MINUTES_MS).toISOString();

    let updatedFrom: string = '';
    if (lastSyncDate) {
        const lastSync = new Date(lastSyncDate);
        if (!isNaN(lastSync.getTime())) {
            // Ensure Updated_From is never after Updated_Through
            const safeFrom = Math.min(lastSync.getTime(), new Date(updatedThrough).getTime());
            updatedFrom = new Date(safeFrom).toISOString();
        }
    }

    return { updatedFrom, updatedThrough };
}
