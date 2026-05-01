import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-folder-as-zip.js';

describe('dropbox download-folder-as-zip tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-folder-as-zip',
        Model: 'ActionOutput_dropbox_downloadfolderaszip'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
