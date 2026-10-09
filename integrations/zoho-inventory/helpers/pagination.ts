import { z } from 'zod';
import type { NangoSync } from 'nango';

const PAGE_SIZE = 200;

const ListResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const RecordTimestampSchema = z.object({
    last_modified_time: z.string().nullish()
});

export interface KeysetPosition {
    /** Inclusive last_modified_time lower bound; undefined starts from the oldest record. */
    cursor: string | undefined;
    /** Page within the records sharing `cursor`; only exceeds 1 when a full page shares one timestamp. */
    page: number;
}

export interface KeysetPage {
    records: unknown[];
    /** Where the next request (or a resumed run) starts. */
    next: KeysetPosition;
    done: boolean;
}

/**
 * Lists a Zoho Inventory collection in ascending last_modified_time order, anchoring every
 * request on the newest timestamp seen so far (the filter is inclusive) instead of advancing a
 * page offset. Offsets are unstable here: deleting already-read records shifts unread ones onto
 * earlier pages, and editing a record moves it to the end of the sort, so an offset scan (or a
 * resumed one) can skip live records. With a value cursor, deletions cannot move unread records
 * behind the cursor and edited records reappear later in the same scan. Records sharing the
 * cursor timestamp are re-read; callers upsert, so that is harmless.
 */
export async function* paginateByLastModifiedTime(
    nango: NangoSync,
    { endpoint, responseKey, organizationId, start }: { endpoint: string; responseKey: string; organizationId: string; start: KeysetPosition }
): AsyncGenerator<KeysetPage> {
    let { cursor, page } = start;
    let done = false;

    while (!done) {
        const response = await nango.get({
            endpoint,
            params: {
                organization_id: organizationId,
                sort_column: 'last_modified_time',
                sort_order: 'A',
                page,
                per_page: PAGE_SIZE,
                ...(cursor ? { last_modified_time: cursor } : {})
            },
            retries: 3
        });

        const envelope = ListResponseSchema.passthrough().parse(response.data);
        if (envelope.code !== 0) {
            throw new Error(`Zoho Inventory returned code ${envelope.code} listing ${responseKey}: ${envelope.message ?? 'unknown error'}`);
        }

        // Zoho always includes the list key (as [] when empty). A missing key is a malformed response: treating it
        // as an empty final page would end a full-refresh scan early and let trackDeletesEnd delete every record.
        const parsedRecords = z.array(z.unknown()).safeParse(envelope[responseKey]);
        if (!parsedRecords.success) {
            throw new Error(`Zoho Inventory response is missing the "${responseKey}" array: ${parsedRecords.error.message}`);
        }
        const records = parsedRecords.data;
        const last = records[records.length - 1];
        const lastModified = last === undefined ? undefined : (RecordTimestampSchema.parse(last).last_modified_time ?? undefined);

        if (records.length < PAGE_SIZE) {
            done = true;
            cursor = lastModified ?? cursor;
            page = 1;
        } else if (!lastModified) {
            throw new Error(`Zoho Inventory returned a ${responseKey} record without last_modified_time; cannot advance the cursor.`);
        } else if (lastModified === cursor) {
            page += 1;
        } else {
            cursor = lastModified;
            page = 1;
        }

        yield { records, next: { cursor, page }, done };
    }
}
