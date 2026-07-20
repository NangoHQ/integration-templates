import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/events.js';

describe('shopify-partner events tests', () => {
    const models = 'Event'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'events',
            Model: 'Event'
        });

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    afterEach(() => {
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

    it('should get, map correctly the data and batchDelete the result', async () => {
        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        await createSync.exec(nangoMock);

        for (const model of models) {
            const batchDeleteData = await nangoMock.getBatchDeleteData(model);
            if (batchDeleteData && batchDeleteData.length > 0) {
                const spiedData = batchDeleteSpy.mock.calls.flatMap((call) => {
                    if (call[1] === model) {
                        return call[0];
                    }

                    return [];
                });

                // Normalize spy-captured args into plain JSON so they compare cleanly
                // with fixture data loaded from `*.test.json`.
                // Removes things like prototypes, undefined values and other non-serializable data.
                const spied = JSON.parse(JSON.stringify(spiedData));

                expect(spied).toStrictEqual(batchDeleteData);
            }
        }
    });

    it('should start an empty-history backfill from a fixed floor date and walk forward in bounded windows, instead of only looking back 30 days', async () => {
        const { nangoMock } = createTestContext();
        const postSpy = vi.spyOn(nangoMock, 'post');
        const saveCheckpointSpy = vi.spyOn(nangoMock, 'saveCheckpoint');

        await createSync.exec(nangoMock);

        // A truly empty account still requires walking many fixed-size windows forward from the
        // backfill floor to reach the present -- regression coverage for the bug where an empty
        // window left `occurredAtMin` unchanged and the sync never advanced past the last 30 days.
        expect(postSpy.mock.calls.length).toBeGreaterThan(1);

        const firstCall = postSpy.mock.calls[0]?.[0];
        expect(firstCall?.data?.variables?.occurredAtMin).toBe('2006-01-01T00:00:00.000Z');

        // Every request must pin both bounds explicitly -- Shopify silently limits the window to
        // 30 days whenever only one of occurredAtMin/occurredAtMax is supplied.
        for (const call of postSpy.mock.calls) {
            const variables = call[0]?.data?.variables;
            expect(variables?.occurredAtMin).toBeTruthy();
            expect(variables?.occurredAtMax).toBeTruthy();
        }

        // Every drained window must be persisted before moving on, so a resumed run never
        // re-derives an ambiguous "not started vs. already drained" state from an empty cursor.
        expect(saveCheckpointSpy.mock.calls.length).toBeGreaterThan(0);
        for (const call of saveCheckpointSpy.mock.calls) {
            expect(typeof call[0]?.windowDrained).toBe('boolean');
        }
    });

    it('should stop advancing once it catches up to the current watermark instead of looping forever', async () => {
        const { nangoMock } = createTestContext();
        const postSpy = vi.spyOn(nangoMock, 'post');

        await createSync.exec(nangoMock);

        // Backfilling from 2006 in 365-day windows comfortably finishes well under the
        // per-run safety cap for an empty account; the run must terminate rather than spin.
        expect(postSpy.mock.calls.length).toBeLessThan(50);
    });
});
