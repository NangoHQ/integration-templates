import { vi, expect, it, describe } from 'vitest';

import fetchData from '../syncs/unified-employees.js';

describe('sap-success-factors unified-employees tests', () => {
    const nangoMock = new global.vitest.NangoSyncMock({
        dirname: __dirname,
        name: 'unified-employees',
        Model: 'StandardEmployee'
    });

    const models = 'StandardEmployee'.split(',');
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

});
