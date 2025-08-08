import type { NangoSync } from 'nango';
import type { SapSuccessFactorsComprehensiveEmployee } from '../types.js';

/**
 * Parses a SAP /Date(milliseconds)/ string or returns a valid ISO string as-is.
 * @param sapDateString - SAP-style or ISO 8601 date string
 * @returns ISO 8601 date string
 */
export function parseSapDateToISOString(sapDateString: string | null | undefined): string {
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

// Pick latest based on the startDate
export function getMostRecentInfo(infos: any | undefined) {
    if (typeof infos === 'object' && !Array.isArray(infos) && Object.keys(infos).length === 0) {
        return undefined;
    }

    if (!Array.isArray(infos)) {
        return undefined;
    }
    if (infos.length === 1) {
        return infos[0];
    }

    return infos
        .map((info) => ({
            ...info,
            // This is commonly used for most effective-dated records in SAP (like employment history, personal info, etc.).
            parsedStartDate: parseSapDateToISOString(info['startDate'])
        }))
        .filter((info) => info.parsedStartDate !== null)
        .sort((a, b) => new Date(b.parsedStartDate).getTime() - new Date(a.parsedStartDate).getTime())[0];
}

export async function getEmployeeLastModifiedWithPath(
    employeeRecord: SapSuccessFactorsComprehensiveEmployee,
    nango: NangoSync
): Promise<{ date: string; path: string; timestamp: number } | null> {
    if (!employeeRecord) return null;

    let mostRecent: { date: string; path: string; timestamp: number } | null = null;
    const visited = new WeakSet();

    async function traverse(obj: any, path = ''): Promise<void> {
        if (!obj || typeof obj !== 'object') return;

        // Add cycle detection to prevent infinite recursion
        if (visited.has(obj)) return;
        visited.add(obj);

        if (obj.lastModifiedDateTime) {
            // @allowTryCatch
            try {
                const isoDate = parseSapDateToISOString(obj.lastModifiedDateTime);
                const timestamp = new Date(isoDate).getTime();

                if (!mostRecent || timestamp > mostRecent.timestamp) {
                    mostRecent = {
                        date: isoDate,
                        path: path ? `${path}.lastModifiedDateTime` : 'lastModifiedDateTime',
                        timestamp
                    };
                }
            } catch {
                await nango.log(`Invalid lastModifiedDateTime at path ${path}: ${obj.lastModifiedDateTime}`, {});
            }
        }

        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                for (let index = 0; index < value.length; index++) {
                    await traverse(value[index], `${path}.${key}[${index}]`);
                }
            } else if (value && typeof value === 'object') {
                await traverse(value, `${path}.${key}`);
            }
        }
    }

    await traverse(employeeRecord);
    return mostRecent;
}
