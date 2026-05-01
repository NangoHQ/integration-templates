import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-file-revisions.js';

describe('dropbox list-file-revisions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-file-revisions',
        Model: 'ActionOutput_dropbox_listfilerevisions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
