import { vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/calendar-events.js';

describe('google-calendar calendar-events tests', () => {
  const models = 'CalendarEvent'.split(',');

  const createMock = () => new (global as any).vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "calendar-events",
      Model: "CalendarEvent"
  });

  it('should get, map correctly the data and batchSave the result', async () => {
    const nangoMock = createMock();
    const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');
    vi.spyOn(nangoMock, 'getMetadata').mockResolvedValue({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T08:41:42.361Z'));

    await createSync.exec(nangoMock);

    vi.useRealTimers();

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
      vi.spyOn(nangoMock, 'getMetadata').mockResolvedValue({});
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-12T08:41:42.361Z'));

      await createSync.exec(nangoMock);

      vi.useRealTimers();

      for (const model of models) {
          const batchDeleteData = await nangoMock.getBatchDeleteData(model);
          if (batchDeleteData && batchDeleteData.length > 0) {
              const actualBatchDeleteData = nangoMock.batchDelete.mock.calls
                .filter((call: [Array<{ id: string }>, string]) => call[1] === model)
                .flatMap((call: [Array<{ id: string }>, string]) => call[0]);

              const expectedIds = new Set(batchDeleteData.map((record: { id: string }) => record.id));
              for (const record of actualBatchDeleteData) {
                expect(expectedIds.has(record.id)).toBe(true);
              }
          }
      }
  });
});
