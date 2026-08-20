import type { ProxyConfiguration } from 'nango';
import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/blocks.js';

describe('acuity-scheduling blocks checkpoints', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('seeds the complete collection once and establishes a partial-sync checkpoint', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

        const nangoMock = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'blocks',
            Model: 'Block'
        });
        nangoMock.get.mockResolvedValue({ data: [] });

        await createSync.exec(nangoMock);

        expect(nangoMock.get).toHaveBeenCalledOnce();
        expect(nangoMock.get).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/blocks',
                params: {}
            })
        );
        expect(nangoMock.saveCheckpoint).toHaveBeenCalledWith({ window_start: '2026-08-20' });
        expect(nangoMock.trackDeletesStart).not.toHaveBeenCalled();
        expect(nangoMock.trackDeletesEnd).not.toHaveBeenCalled();
    });

    it('resumes in overlapping weekly windows and checkpoints every empty window', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

        const nangoMock = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'blocks',
            Model: 'Block'
        });
        nangoMock.getCheckpoint.mockResolvedValue({ window_start: '2026-08-01' });

        const requests: ProxyConfiguration[] = [];
        nangoMock.get.mockImplementation((config: ProxyConfiguration) => {
            requests.push(config);
            return Promise.resolve({ data: [] });
        });

        await createSync.exec(nangoMock);

        expect(requests.map((request) => request.params)).toStrictEqual([
            { max: 10_000, minDate: '2026-08-01', maxDate: '2026-08-08' },
            { max: 10_000, minDate: '2026-08-08', maxDate: '2026-08-15' },
            { max: 10_000, minDate: '2026-08-15', maxDate: '2026-08-20' },
            { max: 10_000, minDate: '2026-08-20' }
        ]);
        expect(nangoMock.saveCheckpoint).toHaveBeenCalledTimes(3);
        expect(nangoMock.saveCheckpoint).toHaveBeenLastCalledWith({ window_start: '2026-08-20' });
        expect(nangoMock.batchSave).not.toHaveBeenCalled();
    });

    it('re-reads the current day when the date-resolution checkpoint is caught up', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-20T23:00:00.000Z'));

        const nangoMock = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'blocks',
            Model: 'Block'
        });
        nangoMock.getCheckpoint.mockResolvedValue({ window_start: '2026-08-20' });
        nangoMock.get.mockResolvedValue({ data: [] });

        await createSync.exec(nangoMock);

        expect(nangoMock.get).toHaveBeenCalledWith(
            expect.objectContaining({
                params: { max: 10_000, minDate: '2026-08-20' }
            })
        );
        expect(nangoMock.saveCheckpoint).toHaveBeenCalledWith({ window_start: '2026-08-20' });
    });
});
