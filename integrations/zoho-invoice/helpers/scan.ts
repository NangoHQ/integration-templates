import { z } from 'zod';
import type { NangoAction } from 'nango';

// Zoho Invoice has no deleted-records feed, so deletions are only observable by a full listing.
// Hourly runs are incremental; once a day the sync re-lists everything with delete tracking on.
const FULL_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PER_PAGE = 200;

export const ScanCheckpointSchema = z.object({
    last_modified_time: z
        .string()
        .describe('Inclusive last_modified_time filter for the window in progress, in the provider format. Empty string means no filter (full scan).'),
    page: z.number().int().positive().describe('1-based page to resume the current window from.'),
    max_modified_time: z.string().describe('Newest last_modified_time saved so far; becomes the next window filter. Empty string when nothing has been saved.'),
    full_scan: z.boolean().describe('Whether the window in progress is a full listing with delete tracking.'),
    last_full_scan_at: z.string().describe('ISO-8601 time the last full scan completed. Empty string when none has completed.')
});

type ScanCheckpoint = z.infer<typeof ScanCheckpointSchema>;

const ListResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    page_context: z
        .object({
            has_more_page: z.boolean().optional()
        })
        .optional()
});

const TimestampedRowSchema = z.object({
    last_modified_time: z.string()
});

// The subset of a sync's nango client the scan needs; any sync declaring ScanCheckpointSchema satisfies it.
interface ScanNango extends Pick<NangoAction, 'get'> {
    getCheckpoint(): Promise<unknown>;
    saveCheckpoint(checkpoint: ScanCheckpoint): Promise<void>;
    trackDeletesStart(model: string): unknown;
    trackDeletesEnd(model: string): unknown;
}

interface ScanOptions {
    model: string;
    endpoint: string;
    responseKey: string;
    organizationId: string;
    /**
     * Whether the endpoint accepts sort_column=last_modified_time. When it does, each page is fetched
     * from the last timestamp seen (keyset paging), which cannot skip rows that move while paging.
     * Otherwise rows are paged by offset in created_time order, which updates do not reorder.
     */
    sortableByLastModified: boolean;
    savePage: (rows: unknown[]) => Promise<void>;
}

function laterOf(current: string, candidate: string): string {
    if (current === '') {
        return candidate;
    }
    return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}

function fullScanDue(lastFullScanAt: string): boolean {
    return lastFullScanAt === '' || Date.now() - Date.parse(lastFullScanAt) >= FULL_SCAN_INTERVAL_MS;
}

export async function scanZohoList(nango: ScanNango, options: ScanOptions): Promise<void> {
    const parsedCheckpoint = ScanCheckpointSchema.safeParse(await nango.getCheckpoint());
    let state: ScanCheckpoint = parsedCheckpoint.success
        ? parsedCheckpoint.data
        : { last_modified_time: '', page: 1, max_modified_time: '', full_scan: true, last_full_scan_at: '' };

    if (!state.full_scan && state.page === 1 && fullScanDue(state.last_full_scan_at)) {
        state = { ...state, last_modified_time: '', full_scan: true };
    }

    if (state.full_scan) {
        await nango.trackDeletesStart(options.model);
    }

    let hasMorePage = true;
    while (hasMorePage) {
        const response = await nango.get({
            endpoint: options.endpoint,
            params: {
                organization_id: options.organizationId,
                sort_column: options.sortableByLastModified ? 'last_modified_time' : 'created_time',
                sort_order: 'A',
                page: state.page,
                per_page: PER_PAGE,
                ...(state.last_modified_time !== '' && { last_modified_time: state.last_modified_time })
            },
            retries: 3
        });

        const envelope = ListResponseSchema.parse(response.data);
        const rows = z.record(z.string(), z.unknown()).parse(response.data)[options.responseKey];
        if (envelope.code !== 0 || !Array.isArray(rows)) {
            throw new Error(`Zoho Invoice ${options.endpoint} failed with code ${envelope.code}: ${envelope.message ?? 'missing results'}`);
        }

        if (rows.length > 0) {
            await options.savePage(rows);
        }

        const timestamps = rows.map((row) => TimestampedRowSchema.parse(row).last_modified_time);
        let maxModifiedTime = state.max_modified_time;
        for (const timestamp of timestamps) {
            maxModifiedTime = laterOf(maxModifiedTime, timestamp);
        }

        hasMorePage = envelope.page_context?.has_more_page === true;
        if (!hasMorePage) {
            state = { ...state, max_modified_time: maxModifiedTime };
            break;
        }

        const lastTimestamp = timestamps[timestamps.length - 1];
        if (options.sortableByLastModified && lastTimestamp !== undefined && lastTimestamp !== state.last_modified_time) {
            // The filter is inclusive, so restarting at page 1 re-reads rows sharing lastTimestamp (idempotent saves)
            // and anything modified meanwhile moves ahead of the cursor instead of shifting unseen rows behind it.
            state = { ...state, last_modified_time: lastTimestamp, page: 1, max_modified_time: maxModifiedTime };
        } else {
            // A full page sharing one timestamp (or an endpoint without the sort) advances by offset.
            state = { ...state, page: state.page + 1, max_modified_time: maxModifiedTime };
        }

        await nango.saveCheckpoint(state);
    }

    if (state.full_scan) {
        await nango.trackDeletesEnd(options.model);
    }

    await nango.saveCheckpoint({
        last_modified_time: state.max_modified_time,
        page: 1,
        max_modified_time: state.max_modified_time,
        full_scan: false,
        last_full_scan_at: state.full_scan ? new Date().toISOString() : state.last_full_scan_at
    });
}
