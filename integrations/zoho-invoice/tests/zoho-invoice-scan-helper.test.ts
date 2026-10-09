import { describe, expect, it, vi } from 'vitest';

import { scanZohoList } from '../helpers/scan.js';

interface Row {
    id: string;
    last_modified_time: string;
}

// Fake Zoho list endpoint: sorts ascending by last_modified_time and applies the inclusive filter, as verified live.
function createFakeNango(rows: Row[], checkpoint: Record<string, unknown> | null = null, perPage = 2) {
    const saved: string[] = [];
    const checkpoints: unknown[] = [];
    const nango = {
        get: vi.fn(async ({ params }: { params: Record<string, string | number> }) => {
            const filter = params['last_modified_time'];
            const page = Number(params['page']);
            const matching = rows
                .filter((row) => filter === undefined || Date.parse(row.last_modified_time) >= Date.parse(String(filter)))
                .sort((a, b) => Date.parse(a.last_modified_time) - Date.parse(b.last_modified_time));
            const slice = matching.slice((page - 1) * perPage, page * perPage);
            return { data: { code: 0, message: 'success', items: slice, page_context: { has_more_page: matching.length > page * perPage } } };
        }),
        getCheckpoint: vi.fn(async () => checkpoint),
        saveCheckpoint: vi.fn(async (value: unknown) => {
            checkpoints.push(value);
        }),
        trackDeletesStart: vi.fn(async () => undefined),
        trackDeletesEnd: vi.fn(async () => ({ deletedKeys: [] }))
    };
    return { nango, saved, checkpoints };
}

async function scan(fake: ReturnType<typeof createFakeNango>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural fake of the nango client
    await scanZohoList(fake.nango as any, {
        model: 'Item',
        endpoint: '/items',
        responseKey: 'items',
        organizationId: 'org',
        sortableByLastModified: true,
        savePage: async (rows) => {
            fake.saved.push(...(rows as Row[]).map((row) => row.id));
        }
    });
}

const rows: Row[] = [
    { id: 'a', last_modified_time: '2026-10-01T10:00:00-0400' },
    { id: 'b', last_modified_time: '2026-10-01T10:00:00-0400' },
    { id: 'c', last_modified_time: '2026-10-01T10:00:00-0400' },
    { id: 'd', last_modified_time: '2026-10-01T11:00:00-0400' },
    { id: 'e', last_modified_time: '2026-10-01T12:00:00-0400' }
];

describe('zoho-invoice scanZohoList', () => {
    it('runs a full scan with delete tracking on first run and sees every row, even when a page shares one timestamp', async () => {
        const fake = createFakeNango(rows);
        await scan(fake);

        expect(new Set(fake.saved)).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
        expect(fake.nango.trackDeletesStart).toHaveBeenCalledWith('Item');
        expect(fake.nango.trackDeletesEnd).toHaveBeenCalledWith('Item');
        expect(fake.checkpoints.at(-1)).toMatchObject({
            last_modified_time: '2026-10-01T12:00:00-0400',
            page: 1,
            max_modified_time: '2026-10-01T12:00:00-0400',
            full_scan: false
        });
    });

    it('runs incrementally from the watermark without delete tracking while the last full scan is recent', async () => {
        const fake = createFakeNango(rows, {
            last_modified_time: '2026-10-01T11:00:00-0400',
            page: 1,
            max_modified_time: '2026-10-01T11:00:00-0400',
            full_scan: false,
            last_full_scan_at: new Date().toISOString()
        });
        await scan(fake);

        expect(fake.saved).toEqual(['d', 'e']);
        expect(fake.nango.trackDeletesStart).not.toHaveBeenCalled();
        expect(fake.nango.trackDeletesEnd).not.toHaveBeenCalled();
    });

    it('switches to a full scan once the last full scan is a day old', async () => {
        const fake = createFakeNango(rows, {
            last_modified_time: '2026-10-01T11:00:00-0400',
            page: 1,
            max_modified_time: '2026-10-01T11:00:00-0400',
            full_scan: false,
            last_full_scan_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
        });
        await scan(fake);

        expect(new Set(fake.saved)).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
        expect(fake.nango.trackDeletesEnd).toHaveBeenCalledWith('Item');
    });

    it('does not skip rows when an already-seen row is modified mid-scan', async () => {
        const data = rows.map((row) => ({ ...row }));
        const fake = createFakeNango(data, null, 2);
        const originalGet = fake.nango.get.getMockImplementation()!;
        let calls = 0;
        fake.nango.get.mockImplementation(async (config) => {
            calls += 1;
            if (calls === 2) {
                // 'a' was read on page 1 and is now edited, moving it to the end of the sort order.
                data[0] = { id: 'a', last_modified_time: '2026-10-01T13:00:00-0400' };
            }
            return originalGet(config);
        });
        await scan(fake);

        expect(new Set(fake.saved)).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
    });
});
