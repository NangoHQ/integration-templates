import { afterEach, describe, expect, it, vi } from 'vitest';

import createSync from '../syncs/settings.js';

describe('google-calendar settings sync tests', () => {
    const createTestContext = () => {
        const nangoMock: any = new (globalThis as any).vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'settings',
            Model: 'Setting'
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

        const expectedBatchSaveData = await nangoMock.getBatchSaveData('Setting');
        const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
            if (call[1] === 'Setting') {
                return call[0];
            }

            return [];
        });

        const spied = JSON.parse(JSON.stringify(spiedData));

        expect(spied).toStrictEqual(expectedBatchSaveData);
    });

    it('should use full-refresh delete tracking', async () => {
        const { nangoMock } = createTestContext();

        await createSync.exec(nangoMock);

        expect(nangoMock.trackDeletesStart).toHaveBeenCalledWith('Setting');
        expect(nangoMock.trackDeletesEnd).toHaveBeenCalledWith('Setting');
        expect(nangoMock.saveCheckpoint).not.toHaveBeenCalled();
        expect(nangoMock.clearCheckpoint).not.toHaveBeenCalled();
    });

    it('should fetch the settings list in a single request', async () => {
        const { nangoMock } = createTestContext();

        await createSync.exec(nangoMock);

        expect(nangoMock.get).toHaveBeenCalledTimes(1);
        expect(nangoMock.get).toHaveBeenCalledWith({
            endpoint: '/calendar/v3/users/me/settings',
            retries: 3
        });
        expect(nangoMock.paginate).not.toHaveBeenCalled();
    });
});
