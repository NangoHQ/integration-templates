import { vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/calendar-events.js';

describe('google-calendar calendar-events tests', () => {
    const models = 'CalendarEvent'.split(',');

    function createNangoMock() {
        return new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'calendar-events',
            Model: 'CalendarEvent'
        });
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
