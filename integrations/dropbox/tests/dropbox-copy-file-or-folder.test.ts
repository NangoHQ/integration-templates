import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-file-or-folder.js';

describe('dropbox copy-file-or-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-file-or-folder',
        Model: 'ActionOutput_dropbox_copyfileorfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
