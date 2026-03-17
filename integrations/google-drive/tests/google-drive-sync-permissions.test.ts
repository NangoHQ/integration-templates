import { vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/sync-permissions.js';

describe('google-drive sync-permissions tests', () => {
    const models = 'Permission'.split(',');
    const FIXTUREFILELIMIT = 10;

    function createNangoMock() {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'sync-permissions',
            Model: 'Permission'
        });
        const originalPaginate = nangoMock.paginate.bind(nangoMock);

        // The saved fixture only includes permission mocks for the first 10 files.
        (nangoMock as typeof nangoMock & { paginate: typeof nangoMock.paginate }).paginate = async function* (config: any) {
            if (config?.endpoint === '/drive/v3/files') {
                let yielded = 0;

                for await (const batch of originalPaginate(config)) {
                    if (!Array.isArray(batch)) {
                        yield batch;
                        continue;
                    }

                    const remaining = FIXTUREFILELIMIT - yielded;
                    if (remaining <= 0) {
                        return;
                    }

                    const limitedBatch = batch.slice(0, remaining);
                    if (limitedBatch.length === 0) {
                        return;
                    }

                    yielded += limitedBatch.length;
                    yield limitedBatch;

                    if (yielded >= FIXTUREFILELIMIT) {
                        return;
                    }
                }

                return;
            }

            for await (const batch of originalPaginate(config)) {
                yield batch;
            }
        } as typeof nangoMock.paginate;

        return nangoMock;
    }

    it('should get, map correctly the data and batchSave the result', async () => {
        const nangoMock = createNangoMock();
        const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');

        await createSync.exec(nangoMock);

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
        const nangoMock = createNangoMock();
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

                const spied = JSON.parse(JSON.stringify(spiedData));

                expect(spied).toStrictEqual(batchDeleteData);
            }
        }
    });
});
