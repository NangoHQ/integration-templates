import { vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/sync-marketing-emails.js';

describe('hubspot-knnj sync-marketing-emails tests', () => {
  const models = 'MarketingEmail'.split(',');

  const createMock = () => new (global as any).vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "sync-marketing-emails",
      Model: "MarketingEmail"
  });

  it('should get, map correctly the data and batchSave the result', async () => {
    const nangoMock = createMock();
    const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');

    await createSync.exec(nangoMock);

    for (const model of models) {
      const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

      const spiedData = batchSaveSpy.mock.calls.flatMap(call => {
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
      const nangoMock = createMock();

      await createSync.exec(nangoMock);

      for (const model of models) {
          const batchDeleteData = await nangoMock.getBatchDeleteData(model);
          if (batchDeleteData && batchDeleteData.length > 0) {
              expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, model);
          }
      }
  });
});
