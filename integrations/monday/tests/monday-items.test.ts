import { afterEach, beforeEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/items.js';

describe('monday items tests', () => {
    const models = 'Item'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'items',
            Model: 'Item'
        });

        // Fixture was recorded from an incremental run resuming from this checkpoint,
        // so the mock must start from the same checkpoint to send a matching request.
        nangoMock.checkpoint = { updated_after: '2024-01-01T00:00:00Z' };

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    beforeEach(() => {
        // The sync computes `new Date()` as the upper bound of its incremental filter window,
        // which flows into the request sent to monday.com. The fixture was recorded at this
        // exact instant, so the clock must be frozen here or the computed upper bound won't
        // match the recorded request and the mock lookup will fail.
        vi.useFakeTimers({ now: new Date('2026-07-09T20:33:58.335Z') });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();

        await createSync.exec(nangoMock);

        for (const model of models) {
            const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

            const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
                if (call[1] === model) {
                    return call[0];
                }

                return [];
            });

            // Normalize spy-captured args into plain JSON so they compare cleanly
            // with fixture data loaded from `*.test.json`.
            // Removes things like prototypes, undefined values and other non-serializable data.
            const spied = JSON.parse(JSON.stringify(spiedData));

            expect(spied).toStrictEqual(expectedBatchSaveData);
        }
    });
});
