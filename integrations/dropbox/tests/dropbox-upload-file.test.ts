import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-file.js';

describe('dropbox upload-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-file',
        Model: 'ActionOutput_dropbox_uploadfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
