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

    it('should paginate the settings list with maxResults 250', async () => {
        const { nangoMock } = createTestContext();

        await createSync.exec(nangoMock);

        expect(nangoMock.paginate).toHaveBeenCalledWith({
            endpoint: '/calendar/v3/users/me/settings',
            method: 'get',
            params: {
                maxResults: 250
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'items',
                limit_name_in_request: 'maxResults',
                limit: 250
            },
            retries: 3
        });
    });
});
