import { vi, expect, it, describe, afterEach } from 'vitest';

import createAction from '../actions/upload-document.js';

describe('google-drive upload-document cleanup on failure tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-document-cleanup-on-failure',
        Model: 'ActionOutput_google_drive_uploaddocument'
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should delete the created file when Drive definitively rejects the content upload (4xx), then rethrow', async () => {
        const input = await nangoMock.getInput();
        const rejection = Object.assign(new Error('Request failed with status code 403'), {
            response: { status: 403 }
        });
        vi.spyOn(nangoMock, 'patch').mockRejectedValueOnce(rejection);
        const deleteSpy = vi.spyOn(nangoMock, 'delete');

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow('Request failed with status code 403');

        expect(deleteSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/drive/v3/files/13gagWd0Y0_VacCQDVBqTxj_n7mlvBh5i'
            })
        );
    });

    it('should preserve the file on an ambiguous failure (no response), since the content may have been applied', async () => {
        const input = await nangoMock.getInput();
        vi.spyOn(nangoMock, 'patch').mockRejectedValueOnce(new Error('socket hang up'));
        const deleteSpy = vi.spyOn(nangoMock, 'delete');

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow('socket hang up');

        expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should preserve the file when the upload returns 2xx with an empty body', async () => {
        const input = await nangoMock.getInput();
        const deleteSpy = vi.spyOn(nangoMock, 'delete');

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow();

        expect(deleteSpy).not.toHaveBeenCalled();
    });
});
