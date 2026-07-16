import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/transactions.js';

describe('paypal transactions tests', () => {
    const models = 'Transaction'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'transactions',
            Model: 'Transaction'
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
        // Fixed to match the recorded fixture's request windows: this sync computes its date range
        // from the real wall clock, so the mocked HTTP requests must be replayed at the same "now".
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
        // This sync intentionally does not track deletes: it queries by a start_date window rather than
        // enumerating every transaction, so an unseen transaction could simply be outside the current window
        // rather than actually removed upstream (transactions aren't deletable in PayPal anyway). Tracking
        // deletes here would falsely delete live rows.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-13T21:00:00.000Z'));

        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        await createSync.exec(nangoMock);

        expect(batchDeleteSpy).not.toHaveBeenCalled();
    });
});
