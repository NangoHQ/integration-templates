import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-file-or-folder.js';

describe('dropbox move-file-or-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-file-or-folder',
        Model: 'ActionOutput_dropbox_movefileorfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
