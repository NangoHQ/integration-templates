import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-document.js';

describe('google-drive upload-document cleanup on failure tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-document-cleanup-on-failure',
        Model: 'ActionOutput_google_drive_uploaddocument'
    });

    it('should delete the created file when the content upload fails, then rethrow', async () => {
        const input = await nangoMock.getInput();
        const deleteSpy = vi.spyOn(nangoMock, 'delete');

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow();

        expect(deleteSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: '/drive/v3/files/13gagWd0Y0_VacCQDVBqTxj_n7mlvBh5i'
            })
        );
    });
});
