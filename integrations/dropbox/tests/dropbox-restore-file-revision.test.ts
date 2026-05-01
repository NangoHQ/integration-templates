import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-file-revision.js';

describe('dropbox restore-file-revision tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-file-revision',
        Model: 'ActionOutput_dropbox_restorefilerevision'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
