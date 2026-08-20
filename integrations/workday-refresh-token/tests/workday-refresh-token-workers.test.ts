import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/workers.js';

describe('workday-refresh-token workers tests', () => {
  const models = 'Worker'.split(',');

  const createTestContext = () => {
    const nangoMock = new global.vitest.NangoSyncMock({
      dirname: __dirname,
      name: "workers",
      Model: "Worker"
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

      const spiedData = batchSaveSpy.mock.calls.flatMap(call => {
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
        const spiedData = batchDeleteSpy.mock.calls.flatMap(call => {
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

  it('should track deletes on a fresh (offset 0) run but not on a resumed run', async () => {
    const { nangoMock: freshRunMock } = createTestContext();
    freshRunMock.paginate = vi.fn(async function* () {});
    await createSync.exec(freshRunMock);
    expect(freshRunMock.trackDeletesStart).toHaveBeenCalledWith('Worker');
    expect(freshRunMock.trackDeletesEnd).toHaveBeenCalledWith('Worker');

    const { nangoMock: resumedRunMock } = createTestContext();
    resumedRunMock.checkpoint = { offset: 100 };
    resumedRunMock.paginate = vi.fn(async function* () {});
    await createSync.exec(resumedRunMock);
    expect(resumedRunMock.trackDeletesStart).not.toHaveBeenCalled();
    expect(resumedRunMock.trackDeletesEnd).not.toHaveBeenCalled();
  });
});
