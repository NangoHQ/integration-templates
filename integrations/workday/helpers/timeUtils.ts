/**
 * Calculates a date range for incremental syncs with Workday.
 *
 * Workday changes can take up to an hour to appear in the API,
 * so we apply a lag buffer on the Updated_Through boundary to
 * avoid missing late-indexed transactions.
 *
 * This function takes a last sync date and returns a date range that:
 * - Has an upper bound (updatedThrough) that is 60 minutes in the past
 *   to always be less than the current time
 * - Has a lower bound (updatedFrom) that is either:
 *   - Empty string if no valid lastSyncDate is provided
 *   - The earlier of lastSyncDate or updatedThrough to ensure valid range
 *
 * @param lastSyncDate - The timestamp of the last successful sync, as string or Date
 * @returns Object containing:
 *   - updatedFrom: ISO string of range start, or empty if no valid lastSyncDate
 *   - updatedThrough: ISO string of range end (60 mins ago)
 */
export function getIncrementalDateRange(lastSyncDate: string | Date): { updatedFrom: string; updatedThrough: string } {
    const ONE_HOUR_MS = 60 * 60 * 1000;

    // Calculate a "safe" upper bound that is guaranteed to be in the past
    const updatedThrough = new Date(Date.now() - ONE_HOUR_MS).toISOString();

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
