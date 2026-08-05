import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/catalogs.js';

describe('dynamic-mockups catalogs tests', () => {
    const models = 'Catalog'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'catalogs',
            Model: 'Catalog'
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

    it('should bracket the sync with trackDeletesStart/trackDeletesEnd for full-refresh delete tracking', async () => {
        const { nangoMock } = createTestContext();

        await createSync.exec(nangoMock);

        // Deletion for this sync is handled by the platform's trackDeletesStart/trackDeletesEnd
        // snapshot diffing, not by nango.batchDelete, so batchDelete is never called directly here.
        for (const model of models) {
            expect(nangoMock.trackDeletesStart).toHaveBeenCalledWith(model);
            expect(nangoMock.trackDeletesEnd).toHaveBeenCalledWith(model);
        }
    });
});
