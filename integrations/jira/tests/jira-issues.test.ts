import { vi, expect, it, describe } from 'vitest';

import fetchData from '../syncs/issues.js';

describe('jira issues tests', () => {
    const nangoMock = new global.vitest.NangoSyncMock({
        dirname: __dirname,
        name: 'issues',
        Model: 'Issue'
    });

    const models = 'Issue'.split(',');
    const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');

    it('should get, map correctly the data and batchSave the result', async () => {
        await fetchData.exec(nangoMock);

        for (const model of models) {
            const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

            const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
                if (call[1] === model) {
                    return call[0];
                }

                return [];
            });

            const spied = JSON.parse(JSON.stringify(spiedData));

            expect(spied).toStrictEqual(expectedBatchSaveData);
        }
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        await fetchData.exec(nangoMock);

        for (const model of models) {
            const batchDeleteData = await nangoMock.getBatchDeleteData(model);
            if (batchDeleteData && batchDeleteData.length > 0) {
                expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, model);
            }
        }
    });
});
