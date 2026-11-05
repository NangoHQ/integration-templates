import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/campaigns.js';

describe('google-ads campaigns tests', () => {
    const models = 'Campaign'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'campaigns',
            Model: 'Campaign'
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

    // Records saved before RECORD_VERSION 2 hold the old start_date/end_date values; a recent
    // pre-upgrade checkpoint would otherwise take the incremental path and never rewrite them.
    it('forces a full refresh when the checkpoint predates the current record version', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();
        const today = new Date().toISOString().slice(0, 10);
        vi.spyOn(nangoMock, 'getCheckpoint').mockResolvedValue({ updated_after: today, initialized_customer_ids: '1781900691' });
        const saveCheckpointSpy = vi.spyOn(nangoMock, 'saveCheckpoint');

        await createSync.exec(nangoMock);

        const spied = JSON.parse(JSON.stringify(batchSaveSpy.mock.calls.flatMap((call) => (call[1] === 'Campaign' ? call[0] : []))));
        expect(spied).toStrictEqual(await nangoMock.getBatchSaveData('Campaign'));
        expect(saveCheckpointSpy).toHaveBeenCalledWith(expect.objectContaining({ record_version: 2 }));
    });

    it('stays incremental when the checkpoint is at the current record version', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();
        const today = new Date().toISOString().slice(0, 10);
        vi.spyOn(nangoMock, 'getCheckpoint').mockResolvedValue({ updated_after: today, initialized_customer_ids: '1781900691', record_version: 2 });

        // The fixture only records the full-refresh query, so the incremental change_status query has no mock.
        await expect(createSync.exec(nangoMock)).rejects.toThrow();
        expect(batchSaveSpy).not.toHaveBeenCalled();
    });
});
