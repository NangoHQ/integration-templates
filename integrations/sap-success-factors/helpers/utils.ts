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
export function getMostRecentInfo(infos?: any) {
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

/**
 * Builds an OData v2 `$filter` matching records modified on or after `watermark` on any
 * of `paths`.
 *
 * Every expanded nav property needs its own clause. SAP SuccessFactors does not reliably
 * cascade a nested-record edit into the parent entity's `lastModifiedDateTime`, so a filter
 * that only watches the parent silently misses changes made to nested records.
 *
 * `ge` is used rather than `gt` so a record landing exactly on the watermark is re-read
 * instead of skipped. Re-reading is safe because `batchSave` upserts on the record id.
 *
 * @param paths - Entity paths to watch, e.g. `['lastModifiedDateTime', 'personalInfoNav/lastModifiedDateTime']`
 * @param watermark - Inclusive lower bound
 * @returns OData `$filter` expression string
 */
export function buildModifiedAfterFilter(paths: string[], watermark: Date): string {
    const iso = watermark.toISOString();
    return paths.map((path) => `${path} ge datetime'${iso}'`).join(' or ');
}

/**
 * Guards against a nav property being watched by `$filter` without being requested by
 * `$expand`. SAP rejects (or silently ignores) filter clauses on nav properties that were
 * not expanded, which reintroduces the blind spot this module exists to prevent.
 *
 * @param paths - Entity paths passed to `buildModifiedAfterFilter`
 * @param expand - Value of the request's `$expand` parameter
 * @throws if a watched nav property is missing from `$expand`
 */
export function assertFilterPathsExpanded(paths: string[], expand: string): void {
    const expanded = new Set(
        expand
            .split(',')
            .map((nav) => nav.trim().split('/')[0])
            .filter(Boolean)
    );

    const notExpanded = paths.map((path) => path.split('/')[0]).filter((root) => root !== 'lastModifiedDateTime' && !expanded.has(root));

    if (notExpanded.length > 0) {
        throw new Error(
            `Incremental $filter watches nav propert${notExpanded.length === 1 ? 'y' : 'ies'} ` +
                `${notExpanded.join(', ')} that are missing from $expand ('${expand}'). ` +
                `Nested-only changes would be silently missed.`
        );
    }
}
