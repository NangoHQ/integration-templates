import { afterEach, vi, expect, it, describe } from 'vitest';

import createSync from '../syncs/profiles.js';

describe('youcanbook-me-public profiles tests', () => {
    const models = 'Profile'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'profiles',
            Model: 'Profile'
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

    it('should only start delete tracking after the response has been validated, before saving and ending it', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();
        const trackDeletesStartSpy = vi.spyOn(nangoMock, 'trackDeletesStart');
        const trackDeletesEndSpy = vi.spyOn(nangoMock, 'trackDeletesEnd');

        await createSync.exec(nangoMock);

        expect(trackDeletesStartSpy).toHaveBeenCalledWith('Profile');
        expect(trackDeletesEndSpy).toHaveBeenCalledWith('Profile');
        expect(trackDeletesStartSpy.mock.invocationCallOrder[0]).toBeLessThan(batchSaveSpy.mock.invocationCallOrder[0]);
        expect(trackDeletesStartSpy.mock.invocationCallOrder[0]).toBeLessThan(trackDeletesEndSpy.mock.invocationCallOrder[0]);
    });
});
