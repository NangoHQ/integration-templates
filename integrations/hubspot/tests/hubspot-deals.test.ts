import { vi, expect, it, describe } from 'vitest';

import fetchData from '../syncs/deals.js';

describe('hubspot deals tests', () => {
  const nangoMock = new global.vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "deals",
      Model: "Deal"
  });

  const models = 'Deal'.split(',');
  const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');

  it('should get, map correctly the data and batchSave the result', async () => {
    await fetchData(nangoMock);

    for (const model of models) {
        const batchSaveData = await nangoMock.getBatchSaveData(model);

        const totalCalls = batchSaveSpy.mock.calls.length;

        if (totalCalls > models.length) {
            const splitSize = Math.ceil(batchSaveData.length / totalCalls);

            const splitBatchSaveData = [];
            for (let i = 0; i < totalCalls; i++) {
              const chunk = batchSaveData.slice(i * splitSize, (i + 1) * splitSize);
              splitBatchSaveData.push(chunk);
            }

            splitBatchSaveData.forEach((data, index) => {
              // @ts-ignore
              expect(batchSaveSpy?.mock.calls[index][0]).toEqual(data);
            });

        } else {
            expect(nangoMock.batchSave).toHaveBeenCalledWith(batchSaveData, model);
        }
    }
  });

  it('should get, map correctly the data and batchDelete the result', async () => {
      await fetchData(nangoMock);

      for (const model of models) {
          const batchDeleteData = await nangoMock.getBatchDeleteData(model);
          if (batchDeleteData && batchDeleteData.length > 0) {
              expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, model);
          }
      }
  });
});
