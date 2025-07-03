/**
 * Parses a SAP /Date(milliseconds)/ string or returns a valid ISO string as-is.
 * @param sapDateString - SAP-style or ISO 8601 date string
 * @returns ISO 8601 date string
 */
export function parseSapDateToISOString(sapDateString: string | null): string {
    if (!sapDateString) {
        return '';
    }

    // If it's already a valid ISO date string, return it
    const isoDate = new Date(sapDateString);
    if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString();
    }

    // Parse SAP /Date(...)/
    const match = sapDateString.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
    if (!match) {
        throw new Error(`Invalid SAP or ISO date format: ${sapDateString}`);
    }

    const timestamp = parseInt(match[1] || '0', 10);
    return new Date(timestamp).toISOString();
}
