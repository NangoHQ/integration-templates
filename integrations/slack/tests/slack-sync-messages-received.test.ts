import { vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/sync-messages-received.js';

describe('slack sync-messages-received tests', () => {
  const models = 'Message'.split(',');

  const createMock = () => new (global as any).vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "sync-messages-received",
      Model: "Message"
  });

  it('should get, map correctly the data and batchSave the result', async () => {
    const nangoMock = createMock();
    const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');
    const originalGet = nangoMock.get.getMockImplementation();
    vi.spyOn(nangoMock, 'get').mockImplementation(async (config: any) => {
      if (config?.endpoint === 'conversations.list') {
        const response = await originalGet?.call(nangoMock, {
          ...config,
          params: {
            ...(config.params || {}),
            limit: '100'
          }
        });

        return {
          ...response,
          data: {
            ...response.data,
            channels: response.data.channels?.slice(0, 1) || [],
            response_metadata: {
              next_cursor: ''
            }
          }
        };
      }

      return originalGet?.call(nangoMock, config);
    });

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
      const originalGet = nangoMock.get.getMockImplementation();
      vi.spyOn(nangoMock, 'get').mockImplementation(async (config: any) => {
        if (config?.endpoint === 'conversations.list') {
          const response = await originalGet?.call(nangoMock, {
            ...config,
            params: {
              ...(config.params || {}),
              limit: '100'
            }
          });

          return {
            ...response,
            data: {
              ...response.data,
              channels: response.data.channels?.slice(0, 1) || [],
              response_metadata: {
                next_cursor: ''
              }
            }
          };
        }

        return originalGet?.call(nangoMock, config);
      });

      await createSync.exec(nangoMock);

      for (const model of models) {
          const batchDeleteData = await nangoMock.getBatchDeleteData(model);
          if (batchDeleteData && batchDeleteData.length > 0) {
              expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, model);
          }
      }
  });
});
