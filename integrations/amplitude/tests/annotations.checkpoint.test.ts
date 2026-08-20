import type { ProxyConfiguration } from 'nango';
import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/annotations.js';

describe('amplitude annotations checkpoints', () => {
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
            name: 'annotations',
            Model: 'Annotation'
        });
        nangoMock.getMetadata.mockResolvedValue({});
        nangoMock.get.mockResolvedValue({ data: { data: [] } });

        await createSync.exec(nangoMock);

        expect(nangoMock.get).toHaveBeenCalledOnce();
        expect(nangoMock.get).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/api/3/annotations',
                params: {}
            })
        );
        expect(nangoMock.saveCheckpoint).toHaveBeenCalledWith({
            next_window_start: '2026-08-20T12:00:00.000Z',
            metadata_signature: '{"category":null,"chart_id":null,"start":null,"end":null}'
        });
        expect(nangoMock.trackDeletesStart).not.toHaveBeenCalled();
        expect(nangoMock.trackDeletesEnd).not.toHaveBeenCalled();
    });

    it('resumes in weekly windows and checkpoints every persisted empty window', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-20T00:00:00.000Z'));

        const nangoMock = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'annotations',
            Model: 'Annotation'
        });
        nangoMock.getMetadata.mockResolvedValue({});
        nangoMock.getCheckpoint.mockResolvedValue({
            next_window_start: '2026-08-01T00:00:00.000Z',
            metadata_signature: '{"category":null,"chart_id":null,"start":null,"end":null}'
        });

        const requests: ProxyConfiguration[] = [];
        nangoMock.get.mockImplementation((config: ProxyConfiguration) => {
            requests.push(config);
            return Promise.resolve({ data: { data: [] } });
        });

        await createSync.exec(nangoMock);

        expect(requests.map((request) => request.params)).toStrictEqual([
            { start: '2026-07-31T23:59:59.999Z', end: '2026-08-08T00:00:00.000Z' },
            { start: '2026-08-07T23:59:59.999Z', end: '2026-08-15T00:00:00.000Z' },
            { start: '2026-08-14T23:59:59.999Z', end: '2026-08-20T00:00:00.000Z' }
        ]);
        expect(nangoMock.saveCheckpoint).toHaveBeenCalledTimes(3);
        expect(nangoMock.saveCheckpoint).toHaveBeenLastCalledWith({
            next_window_start: '2026-08-20T00:00:00.000Z',
            metadata_signature: '{"category":null,"chart_id":null,"start":null,"end":null}'
        });
        expect(nangoMock.batchSave).not.toHaveBeenCalled();
    });
});
