export function getIncrementalDateRange(lastSyncDate: string | Date, lagMinutes: number = 30): { updatedFrom: string; updatedThrough: string } {
    const LAG_MS = lagMinutes * 60 * 1000;
    const updatedThroughDate = new Date(Date.now() - LAG_MS);
    const updatedThrough = updatedThroughDate.toISOString();

    let updatedFrom = '';
    if (lastSyncDate) {
        const lastSync = new Date(lastSyncDate);
        if (!isNaN(lastSync.getTime())) {
            const safeFrom = Math.min(lastSync.getTime(), updatedThroughDate.getTime());
            updatedFrom = new Date(safeFrom).toISOString();
        }
    }

    return { updatedFrom, updatedThrough };
}
