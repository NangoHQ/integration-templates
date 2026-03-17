import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-document.js';

describe('google-drive upload-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-document',
        Model: 'ActionOutput_google_drive_uploaddocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
