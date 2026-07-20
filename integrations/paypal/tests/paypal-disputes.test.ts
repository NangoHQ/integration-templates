import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/disputes.js';

describe('paypal disputes tests', () => {
    const models = 'Dispute'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'disputes',
            Model: 'Dispute'
        });

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        // Fixed to match the recorded fixture's request window: this sync computes its lookback window
        // from the real wall clock, so the mocked HTTP request must be replayed at the same "now".
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-13T21:00:00.000Z'));

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

    it('should never call batchDelete', async () => {
        // This sync intentionally does not track deletes: it queries by update_time windows rather than
        // enumerating the full dispute catalog, so an unseen dispute could simply be outside the current
        // window rather than actually removed upstream. Tracking deletes here would falsely delete live rows.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-13T21:00:00.000Z'));

        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        await createSync.exec(nangoMock);

        expect(batchDeleteSpy).not.toHaveBeenCalled();
    });
});
